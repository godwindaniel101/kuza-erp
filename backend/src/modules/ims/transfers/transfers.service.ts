import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { InventoryTransfer } from "../entities/inventory-transfer.entity";
import { InventoryTransferItem } from "../entities/inventory-transfer-item.entity";
import { InventoryItem } from "../entities/inventory-item.entity";
import { BranchInventoryItem } from "../entities/branch-inventory-item.entity";
import { Uom } from "../entities/uom.entity";
import { InventoryInflow } from "../entities/inventory-inflow.entity";
import { InventoryInflowItem } from "../entities/inventory-inflow-item.entity";
import {
  CreateInventoryTransferDto,
  UpdateTransferStatusDto,
  ReceiveTransferItemDto,
} from "./dto/create-transfer.dto";
import { UomConversionsService } from "../uom-conversions/uom-conversions.service";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { StockMovementType } from "../entities/stock-movement.entity";

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(InventoryTransfer)
    private transferRepository: Repository<InventoryTransfer>,
    @InjectRepository(InventoryTransferItem)
    private transferItemRepository: Repository<InventoryTransferItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    @InjectRepository(Uom)
    private uomRepository: Repository<Uom>,
    @InjectRepository(InventoryInflow)
    private inflowRepository: Repository<InventoryInflow>,
    @InjectRepository(InventoryInflowItem)
    private inflowItemRepository: Repository<InventoryInflowItem>,
    private uomConversionsService: UomConversionsService,
    private stockMovementsService: StockMovementsService,
  ) {}

  /** Locked read of an inventory item row (pessimistic write lock). */
  private lockInventoryItem(id: string) {
    return this.inventoryItemRepository
      .createQueryBuilder("item")
      .setLock("pessimistic_write")
      .where("item.id = :id", { id })
      .getOne();
  }

  /** Locked read of a branch stock row (pessimistic write lock). */
  private lockBranchInventory(branchId: string, inventoryItemId: string) {
    return this.branchInventoryRepository
      .createQueryBuilder("branchItem")
      .setLock("pessimistic_write")
      .where(
        "branchItem.branchId = :branchId AND branchItem.inventoryItemId = :inventoryItemId",
        { branchId, inventoryItemId },
      )
      .getOne();
  }

  /**
   * Move `baseQuantity` (base units) of an item from the source branch's inflow
   * batches to a new batch at the destination branch, preserving FIFO cost.
   *
   * A sale allocates from `inventory_inflow_items` scoped to the SELLING branch,
   * so transferred stock is only sellable if it exists as inflow batches at the
   * destination. (Before this, transfers moved the `currentStock` counter only,
   * so the POS showed stock the sale engine could not allocate.) This consumes
   * the source batches oldest-first — reducing their base quantity but never
   * below what has already been sold — and recreates the moved quantity as
   * destination batches carrying the original unit cost, keeping COGS accurate.
   */
  private async moveInflowBatchesToBranch(
    inventoryItem: InventoryItem,
    fromBranchId: string,
    toBranchId: string,
    baseQuantity: number,
  ): Promise<void> {
    let remaining = Number(baseQuantity) || 0;
    if (remaining <= 0) return;

    // Source batches for this item at the source branch, oldest first (FIFO).
    const sourceBatches = await this.inflowItemRepository.find({
      where: { inventoryItemId: inventoryItem.id, branchId: fromBranchId },
      order: { createdAt: "ASC" },
    });

    const consumed: Array<{ unitCost: number; quantity: number }> = [];

    for (const batch of sourceBatches) {
      if (remaining <= 0) break;
      // Un-sold portion of this batch (mirrors the sale-allocation formula).
      const soldRows = await this.inflowItemRepository.manager.query(
        `SELECT COALESCE(SUM(quantity_used), 0) AS total_sold
         FROM order_item_inflow_items WHERE inflow_item_id = $1`,
        [batch.id],
      );
      const sold = Number(soldRows[0]?.total_sold || 0);
      const available = Math.max(0, Number(batch.baseQuantity || 0) - sold);
      if (available <= 0) continue;

      const take = Math.min(remaining, available);
      batch.baseQuantity = Number(batch.baseQuantity || 0) - take;
      await this.inflowItemRepository.save(batch);

      consumed.push({ unitCost: Number(batch.unitCost || 0), quantity: take });
      remaining -= take;
    }

    // Shortfall (source had no backing batches — e.g. legacy/opening stock) is
    // still moved so the destination is sellable, valued at the item's cost.
    if (remaining > 0) {
      consumed.push({
        unitCost: Number(inventoryItem.unitCost || 0),
        quantity: remaining,
      });
      remaining = 0;
    }

    if (consumed.length === 0) return;

    const totalAmount = consumed.reduce(
      (sum, c) => sum + c.unitCost * c.quantity,
      0,
    );
    const inflow = await this.inflowRepository.save(
      this.inflowRepository.create({
        branchId: toBranchId,
        receivedDate: new Date(),
        status: "received",
        type: "transfer",
        totalAmount: Math.round(totalAmount * 100) / 100,
      }),
    );

    for (const c of consumed) {
      await this.inflowItemRepository.save(
        this.inflowItemRepository.create({
          inflowId: inflow.id,
          inventoryItemId: inventoryItem.id,
          branchId: toBranchId,
          uomId: inventoryItem.baseUomId,
          quantity: c.quantity,
          baseQuantity: c.quantity,
          unitCost: c.unitCost,
          totalCost: Math.round(c.unitCost * c.quantity * 100) / 100,
        }),
      );
    }
  }

  @Transactional()
  async create(userId: string, createDto: CreateInventoryTransferDto) {
    if (createDto.fromBranchId === createDto.toBranchId) {
      throw new BadRequestException(
        "Source and destination branches cannot be the same",
      );
    }

    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException("Transfer must contain at least one item");
    }

    // Generate transfer number
    const transferNumber = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const transfer = this.transferRepository.create({
      fromBranchId: createDto.fromBranchId,
      toBranchId: createDto.toBranchId,
      transferNumber,
      transferDate: new Date(createDto.transferDate),
      status: "pending",
      notes: createDto.notes,
      initiatedBy: userId,
    });

    const savedTransfer = await this.transferRepository.save(transfer);

    // Process each item
    for (const itemDto of createDto.items) {
      const inventoryItem = await this.inventoryItemRepository.findOne({
        where: { id: itemDto.inventoryItemId },
      });

      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item ${itemDto.inventoryItemId} not found`,
        );
      }

      // Get source branch inventory
      const sourceBranchInventory = await this.branchInventoryRepository.findOne(
        {
          where: {
            branchId: createDto.fromBranchId,
            inventoryItemId: itemDto.inventoryItemId,
          },
        },
      );

      if (!sourceBranchInventory) {
        throw new NotFoundException(`Item not available in source branch`);
      }

      // Convert quantity to base UOM for stock check
      let baseQuantity = itemDto.quantity;
      if (itemDto.uomId !== inventoryItem.baseUomId) {
        baseQuantity = await this.uomConversionsService.convert(
          itemDto.uomId,
          inventoryItem.baseUomId,
          itemDto.quantity,
        );
      }

      const baseUom = await this.uomRepository.findOne({
        where: { id: inventoryItem.baseUomId },
      });
      if (Number(sourceBranchInventory.currentStock) < baseQuantity) {
        throw new BadRequestException(
          `Insufficient stock for ${inventoryItem.name}. Available: ${sourceBranchInventory.currentStock} ${baseUom?.name || "units"}, Requested: ${baseQuantity}`,
        );
      }

      // Create transfer item
      const transferItem = this.transferItemRepository.create({
        transferId: savedTransfer.id,
        inventoryItemId: itemDto.inventoryItemId,
        uomId: itemDto.uomId,
        quantity: itemDto.quantity,
        receivedQuantity: 0,
        notes: itemDto.notes,
      });

      await this.transferItemRepository.save(transferItem);
    }

    return await this.findOne(savedTransfer.id);
  }

  async findAll(branchId?: string) {
    const query = this.transferRepository
      .createQueryBuilder("transfer")
      .leftJoinAndSelect("transfer.fromBranch", "fromBranch")
      .leftJoinAndSelect("transfer.toBranch", "toBranch")
      .orderBy("transfer.transferDate", "DESC")
      .addOrderBy("transfer.createdAt", "DESC");

    if (branchId) {
      query.andWhere(
        "(transfer.fromBranchId = :branchId OR transfer.toBranchId = :branchId)",
        { branchId },
      );
    }

    return await query.getMany();
  }

  async findOne(id: string) {
    const transfer = await this.transferRepository.findOne({
      where: { id },
      relations: ["fromBranch", "toBranch"],
    });

    if (!transfer) {
      throw new NotFoundException("Transfer not found");
    }

    // Load line items via a direct query on the items repository rather than
    // through the transfer.items OneToMany relation: the relation-join form was
    // returning an empty collection (the joined table resolved to the wrong
    // schema), which silently broke all stock movement on status changes.
    transfer.items = await this.transferItemRepository.find({
      where: { transferId: id },
      relations: ["inventoryItem", "inventoryItem.baseUom", "uom"],
    });

    return transfer;
  }

  @Transactional()
  async updateStatus(
    id: string,
    userId: string,
    updateDto: UpdateTransferStatusDto,
  ) {
    const transfer = await this.findOne(id);

    if (transfer.status === "cancelled") {
      throw new BadRequestException(
        "Cannot update status of cancelled transfer",
      );
    }

    if (transfer.status === "received" && updateDto.status !== "cancelled") {
      throw new BadRequestException(
        "Cannot update status of completed transfer",
      );
    }

    if (updateDto.status === "received" && transfer.status !== "in_transit") {
      throw new BadRequestException(
        "Only in-transit transfers can be marked as received",
      );
    }

    if (updateDto.status === "in_transit") {
      // Deduct stock from source branch (locked reads; negative stock is
      // forbidden — audit C-INV-3/4).
      for (const item of transfer.items) {
        const inventoryItem = await this.lockInventoryItem(
          item.inventoryItemId,
        );
        if (!inventoryItem) {
          throw new NotFoundException(
            `Inventory item ${item.inventoryItemId} not found`,
          );
        }

        let baseQuantity = Number(item.quantity);
        if (item.uomId !== inventoryItem.baseUomId) {
          baseQuantity = await this.uomConversionsService.convert(
            item.uomId,
            inventoryItem.baseUomId,
            item.quantity,
          );
        }

        const sourceBranchInventory = await this.lockBranchInventory(
          transfer.fromBranchId,
          item.inventoryItemId,
        );

        const branchAvailable = Number(
          sourceBranchInventory?.currentStock || 0,
        );
        if (!sourceBranchInventory || branchAvailable < baseQuantity) {
          throw new BadRequestException(
            `Insufficient stock for ${inventoryItem.name} at the source branch. Available: ${branchAvailable}, requested: ${baseQuantity}`,
          );
        }
        sourceBranchInventory.currentStock = branchAvailable - baseQuantity;
        await this.branchInventoryRepository.save(sourceBranchInventory);

        // Update main inventory stock
        const totalAvailable = Number(inventoryItem.currentStock || 0);
        if (totalAvailable < baseQuantity) {
          throw new BadRequestException(
            `Insufficient stock for ${inventoryItem.name}. Available: ${totalAvailable}, requested: ${baseQuantity}`,
          );
        }
        inventoryItem.currentStock = totalAvailable - baseQuantity;
        await this.inventoryItemRepository.save(inventoryItem);

        // Immutable ledger entry (roadmap I1): stock leaving the source branch.
        await this.stockMovementsService.record({
          itemId: item.inventoryItemId,
          branchId: transfer.fromBranchId,
          movementType: StockMovementType.TRANSFER_OUT,
          quantity: -baseQuantity,
          sourceType: "transfer",
          sourceId: transfer.id,
          performedById: userId || null,
          balanceAfter: Number(inventoryItem.currentStock),
        });
      }
    } else if (updateDto.status === "received") {
      // Add stock to destination branch
      transfer.receivedBy = userId;
      transfer.receivedAt = new Date();

      for (const item of transfer.items) {
        const inventoryItem = await this.lockInventoryItem(
          item.inventoryItemId,
        );
        if (!inventoryItem) {
          throw new NotFoundException(
            `Inventory item ${item.inventoryItemId} not found`,
          );
        }

        // Decimal columns come back as strings; coerce so `||` and `+` behave
        // numerically ("0.00" is a truthy string and would wrongly win the ||).
        const receivedQty =
          Number(item.receivedQuantity) || Number(item.quantity);
        let baseQuantity = receivedQty;
        if (item.uomId !== inventoryItem.baseUomId) {
          baseQuantity = await this.uomConversionsService.convert(
            item.uomId,
            inventoryItem.baseUomId,
            receivedQty,
          );
        }

        let destBranchInventory = await this.lockBranchInventory(
          transfer.toBranchId,
          item.inventoryItemId,
        );

        if (!destBranchInventory) {
          destBranchInventory = this.branchInventoryRepository.create({
            branchId: transfer.toBranchId,
            inventoryItemId: item.inventoryItemId,
            currentStock: 0,
            salePrice: inventoryItem.salePrice,
            minimumStock: inventoryItem.minimumStock,
            maximumStock: inventoryItem.maximumStock,
          });
        }

        destBranchInventory.currentStock =
          Number(destBranchInventory.currentStock) + Number(baseQuantity);
        await this.branchInventoryRepository.save(destBranchInventory);

        // Move the FIFO inflow batches (with cost basis) from source to
        // destination so the transferred stock is actually sellable at the
        // destination branch — the counter above is display-only.
        await this.moveInflowBatchesToBranch(
          inventoryItem,
          transfer.fromBranchId,
          transfer.toBranchId,
          Number(baseQuantity),
        );

        // Update main inventory stock
        inventoryItem.currentStock =
          Number(inventoryItem.currentStock) + Number(baseQuantity);
        await this.inventoryItemRepository.save(inventoryItem);

        // Update received quantity
        item.receivedQuantity =
          Number(item.receivedQuantity) || Number(item.quantity);
        await this.transferItemRepository.save(item);

        // Immutable ledger entry: stock arriving at the destination branch.
        await this.stockMovementsService.record({
          itemId: item.inventoryItemId,
          branchId: transfer.toBranchId,
          movementType: StockMovementType.TRANSFER_IN,
          quantity: Number(baseQuantity),
          sourceType: "transfer",
          sourceId: transfer.id,
          performedById: userId || null,
          balanceAfter: Number(inventoryItem.currentStock),
        });
      }
    } else if (updateDto.status === "cancelled") {
      // If cancelled from in_transit, restore stock to source branch
      if (transfer.status === "in_transit") {
        for (const item of transfer.items) {
          const inventoryItem = await this.lockInventoryItem(
            item.inventoryItemId,
          );
          if (!inventoryItem) {
            throw new NotFoundException(
              `Inventory item ${item.inventoryItemId} not found`,
            );
          }

          const baseQuantity = await this.uomConversionsService.convert(
            item.uomId,
            inventoryItem.baseUomId,
            item.quantity,
          );

          const sourceBranchInventory = await this.lockBranchInventory(
            transfer.fromBranchId,
            item.inventoryItemId,
          );

          if (sourceBranchInventory) {
            sourceBranchInventory.currentStock =
              Number(sourceBranchInventory.currentStock) + baseQuantity;
            await this.branchInventoryRepository.save(sourceBranchInventory);
          }

          inventoryItem.currentStock =
            Number(inventoryItem.currentStock) + baseQuantity;
          await this.inventoryItemRepository.save(inventoryItem);

          // Immutable ledger entry: cancellation returns the in-transit stock
          // to the source branch.
          await this.stockMovementsService.record({
            itemId: item.inventoryItemId,
            branchId: transfer.fromBranchId,
            movementType: StockMovementType.TRANSFER_IN,
            quantity: Number(baseQuantity),
            sourceType: "transfer",
            sourceId: transfer.id,
            reason: "Transfer cancelled — stock restored to source branch",
            performedById: userId || null,
            balanceAfter: Number(inventoryItem.currentStock),
          });
        }
      }
    }

    transfer.status = updateDto.status;
    await this.transferRepository.save(transfer);

    return await this.findOne(id);
  }

  @Transactional()
  async receiveItems(
    id: string,
    userId: string,
    items: ReceiveTransferItemDto[],
  ) {
    const transfer = await this.findOne(id);

    if (transfer.status !== "in_transit") {
      throw new BadRequestException(
        "Can only receive items for in-transit transfers",
      );
    }

    transfer.receivedBy = userId;
    transfer.receivedAt = new Date();

    for (const receiveItem of items) {
      const transferItem = transfer.items.find(
        (item) => item.id === receiveItem.itemId,
      );
      if (!transferItem) {
        throw new NotFoundException(
          `Transfer item ${receiveItem.itemId} not found`,
        );
      }

      if (receiveItem.receivedQuantity > transferItem.quantity) {
        throw new BadRequestException(
          `Received quantity cannot exceed transferred quantity for ${transferItem.inventoryItem.name}`,
        );
      }

      const inventoryItem = await this.lockInventoryItem(
        transferItem.inventoryItemId,
      );
      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item ${transferItem.inventoryItemId} not found`,
        );
      }

      let baseQuantity = receiveItem.receivedQuantity;
      if (transferItem.uomId !== inventoryItem.baseUomId) {
        baseQuantity = await this.uomConversionsService.convert(
          transferItem.uomId,
          inventoryItem.baseUomId,
          receiveItem.receivedQuantity,
        );
      }

      let destBranchInventory = await this.lockBranchInventory(
        transfer.toBranchId,
        transferItem.inventoryItemId,
      );

      if (!destBranchInventory) {
        destBranchInventory = this.branchInventoryRepository.create({
          branchId: transfer.toBranchId,
          inventoryItemId: transferItem.inventoryItemId,
          currentStock: 0,
          salePrice: inventoryItem.salePrice,
          minimumStock: inventoryItem.minimumStock,
          maximumStock: inventoryItem.maximumStock,
        });
      }

      destBranchInventory.currentStock =
        Number(destBranchInventory.currentStock) + Number(baseQuantity);
      await this.branchInventoryRepository.save(destBranchInventory);

      inventoryItem.currentStock =
        Number(inventoryItem.currentStock) + Number(baseQuantity);
      await this.inventoryItemRepository.save(inventoryItem);

      transferItem.receivedQuantity = receiveItem.receivedQuantity;
      if (receiveItem.notes) {
        transferItem.notes = receiveItem.notes;
      }
      await this.transferItemRepository.save(transferItem);

      // Immutable ledger entry: stock arriving at the destination branch.
      await this.stockMovementsService.record({
        itemId: transferItem.inventoryItemId,
        branchId: transfer.toBranchId,
        movementType: StockMovementType.TRANSFER_IN,
        quantity: Number(baseQuantity),
        sourceType: "transfer",
        sourceId: transfer.id,
        performedById: userId || null,
        balanceAfter: Number(inventoryItem.currentStock),
      });
    }

    // Check if all items are fully received
    const allReceived = transfer.items.every((item) => {
      const receiveItem = items.find((ri) => ri.itemId === item.id);
      const receivedQty =
        receiveItem?.receivedQuantity || item.receivedQuantity || 0;
      return receivedQty >= item.quantity;
    });

    if (allReceived) {
      transfer.status = "received";
    }

    await this.transferRepository.save(transfer);

    return await this.findOne(id);
  }

  async remove(id: string) {
    const transfer = await this.findOne(id);

    if (transfer.status === "in_transit" || transfer.status === "received") {
      throw new BadRequestException(
        "Cannot delete in-transit or received transfers",
      );
    }

    await this.transferRepository.remove(transfer);
    return { success: true };
  }
}
