import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Transactional } from "typeorm-transactional";
import {
  AdjustmentReason,
  AdjustmentStatus,
  InventoryAdjustment,
} from "../entities/inventory-adjustment.entity";
import { InventoryAdjustmentItem } from "../entities/inventory-adjustment-item.entity";
import { InventoryItem } from "../entities/inventory-item.entity";
import { BranchInventoryItem } from "../entities/branch-inventory-item.entity";
import { StockMovementType } from "../entities/stock-movement.entity";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { PostingService } from "../../accounting/posting.service";
import {
  CreateAdjustmentDto,
  QueryAdjustmentsDto,
} from "./dto/create-adjustment.dto";

/** Reasons that represent stock destruction rather than a count correction. */
const WRITE_OFF_REASONS: AdjustmentReason[] = [
  AdjustmentReason.DAMAGE,
  AdjustmentReason.THEFT,
  AdjustmentReason.EXPIRY,
];

@Injectable()
export class AdjustmentsService {
  constructor(
    @InjectRepository(InventoryAdjustment)
    private adjustmentRepository: Repository<InventoryAdjustment>,
    @InjectRepository(InventoryAdjustmentItem)
    private adjustmentItemRepository: Repository<InventoryAdjustmentItem>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    private stockMovementsService: StockMovementsService,
    private postingService: PostingService,
  ) {}

  /** Next sequential number like ADJ-000001 (unique constraint backstops races). */
  private async nextAdjustmentNumber(): Promise<string> {
    const last = await this.adjustmentRepository
      .createQueryBuilder("adjustment")
      .select("adjustment.adjustmentNumber", "adjustmentNumber")
      .orderBy("adjustment.adjustmentNumber", "DESC")
      .limit(1)
      .getRawOne<{ adjustmentNumber: string }>();

    const match = last?.adjustmentNumber?.match(/(\d+)$/);
    const nextSeq = match ? parseInt(match[1], 10) + 1 : 1;
    return `ADJ-${String(nextSeq).padStart(6, "0")}`;
  }

  @Transactional()
  async create(createDto: CreateAdjustmentDto, createdById?: string) {
    for (const line of createDto.items) {
      if (Number(line.quantityChange) === 0) {
        throw new BadRequestException(
          "quantityChange must be non-zero for every adjustment item",
        );
      }
    }

    // Validate all referenced inventory items exist before creating anything.
    const itemIds = [...new Set(createDto.items.map((i) => i.itemId))];
    const inventoryItems = await this.inventoryItemRepository.find({
      where: { id: In(itemIds) },
    });
    const itemById = new Map(inventoryItems.map((i) => [i.id, i]));
    const missing = itemIds.filter((id) => !itemById.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Inventory item(s) not found: ${missing.join(", ")}`,
      );
    }

    const adjustment = this.adjustmentRepository.create({
      adjustmentNumber: await this.nextAdjustmentNumber(),
      branchId: createDto.branchId || null,
      reason: createDto.reason,
      notes: createDto.notes || null,
      status: AdjustmentStatus.DRAFT,
      createdById: createdById || null,
    });
    const savedAdjustment = await this.adjustmentRepository.save(adjustment);

    for (const line of createDto.items) {
      const inventoryItem = itemById.get(line.itemId);
      const adjustmentItem = this.adjustmentItemRepository.create({
        adjustmentId: savedAdjustment.id,
        itemId: line.itemId,
        quantityChange: Number(line.quantityChange),
        // Snapshot the item's current unit cost for later valuation.
        unitCost:
          inventoryItem?.unitCost != null
            ? Number(inventoryItem.unitCost)
            : null,
        reason: line.reason || null,
      });
      await this.adjustmentItemRepository.save(adjustmentItem);
    }

    return this.findOne(savedAdjustment.id);
  }

  async findAll(query: QueryAdjustmentsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.adjustmentRepository
      .createQueryBuilder("adjustment")
      .orderBy("adjustment.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere("adjustment.status = :status", { status: query.status });
    }
    if (query.reason) {
      qb.andWhere("adjustment.reason = :reason", { reason: query.reason });
    }

    const [rows, total] = await qb.getManyAndCount();

    // Attach line items via a direct batched query (relation joins have been
    // observed resolving to the wrong schema in this multi-tenant setup).
    const adjustmentIds = rows.map((a) => a.id);
    const allLines = adjustmentIds.length
      ? await this.adjustmentItemRepository.find({
          where: { adjustmentId: In(adjustmentIds) },
        })
      : [];
    const linesByAdjustment = new Map<string, InventoryAdjustmentItem[]>();
    for (const line of allLines) {
      const arr = linesByAdjustment.get(line.adjustmentId) || [];
      arr.push(line);
      linesByAdjustment.set(line.adjustmentId, arr);
    }

    const items = rows.map((adjustment) => ({
      ...adjustment,
      items: linesByAdjustment.get(adjustment.id) || [],
      itemCount: (linesByAdjustment.get(adjustment.id) || []).length,
    }));

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { id },
    });
    if (!adjustment) {
      throw new NotFoundException("Inventory adjustment not found");
    }

    const lines = await this.adjustmentItemRepository.find({
      where: { adjustmentId: id },
      order: { createdAt: "ASC" },
    });

    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const inventoryItems = itemIds.length
      ? await this.inventoryItemRepository.find({ where: { id: In(itemIds) } })
      : [];
    const nameById = new Map(inventoryItems.map((i) => [i.id, i.name]));

    return {
      ...adjustment,
      items: lines.map((line) => ({
        ...line,
        quantityChange: Number(line.quantityChange),
        unitCost: line.unitCost != null ? Number(line.unitCost) : null,
        itemName: nameById.get(line.itemId) || null,
      })),
    };
  }

  /**
   * Applies the stock changes of a DRAFT adjustment (audit C-INV-2/3/4):
   * runs in one transaction, takes pessimistic row locks on the item and
   * branch stock rows, forbids negative resulting stock, and records an
   * ADJUSTMENT / WRITE_OFF ledger movement per line.
   */
  @Transactional()
  async approve(id: string, approvedById: string) {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { id },
    });
    if (!adjustment) {
      throw new NotFoundException("Inventory adjustment not found");
    }
    if (adjustment.status !== AdjustmentStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT adjustments can be approved (current status: ${adjustment.status})`,
      );
    }

    const lines = await this.adjustmentItemRepository.find({
      where: { adjustmentId: id },
    });
    if (lines.length === 0) {
      throw new BadRequestException(
        "Adjustment has no items and cannot be approved",
      );
    }

    let adjustmentValue = 0;

    for (const line of lines) {
      const quantityChange = Number(line.quantityChange);

      // Lock the item-level stock row before reading/writing it.
      const inventoryItem = await this.inventoryItemRepository
        .createQueryBuilder("item")
        .setLock("pessimistic_write")
        .where("item.id = :itemId", { itemId: line.itemId })
        .getOne();
      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item ${line.itemId} not found`,
        );
      }

      const currentStock = Number(inventoryItem.currentStock) || 0;
      const newStock = Math.round((currentStock + quantityChange) * 100) / 100;
      if (newStock < 0) {
        throw new BadRequestException(
          `Adjustment would take '${inventoryItem.name}' below zero. Available: ${currentStock}, change: ${quantityChange}`,
        );
      }

      // Branch-level stock, when the adjustment targets a branch.
      if (adjustment.branchId) {
        const branchInventory = await this.branchInventoryRepository
          .createQueryBuilder("branchItem")
          .setLock("pessimistic_write")
          .where(
            "branchItem.branchId = :branchId AND branchItem.inventoryItemId = :itemId",
            { branchId: adjustment.branchId, itemId: line.itemId },
          )
          .getOne();

        if (branchInventory) {
          const branchStock = Number(branchInventory.currentStock) || 0;
          const newBranchStock =
            Math.round((branchStock + quantityChange) * 100) / 100;
          if (newBranchStock < 0) {
            throw new BadRequestException(
              `Adjustment would take '${inventoryItem.name}' below zero at the selected branch. Available: ${branchStock}, change: ${quantityChange}`,
            );
          }
          branchInventory.currentStock = newBranchStock;
          await this.branchInventoryRepository.save(branchInventory);
        } else if (quantityChange > 0) {
          await this.branchInventoryRepository.save(
            this.branchInventoryRepository.create({
              branchId: adjustment.branchId,
              inventoryItemId: line.itemId,
              currentStock: quantityChange,
              salePrice: inventoryItem.salePrice,
              minimumStock: inventoryItem.minimumStock,
              maximumStock: inventoryItem.maximumStock,
            }),
          );
        } else {
          throw new BadRequestException(
            `Adjustment would take '${inventoryItem.name}' below zero at the selected branch. Available: 0, change: ${quantityChange}`,
          );
        }
      }

      inventoryItem.currentStock = newStock;
      await this.inventoryItemRepository.save(inventoryItem);

      const movementType =
        WRITE_OFF_REASONS.includes(adjustment.reason) && quantityChange < 0
          ? StockMovementType.WRITE_OFF
          : StockMovementType.ADJUSTMENT;

      await this.stockMovementsService.record({
        itemId: line.itemId,
        branchId: adjustment.branchId,
        movementType,
        quantity: quantityChange,
        unitCost: line.unitCost != null ? Number(line.unitCost) : null,
        sourceType: "adjustment",
        sourceId: adjustment.id,
        reason: line.reason || adjustment.reason,
        performedById: approvedById || null,
        balanceAfter: newStock,
      });

      const lineCost =
        line.unitCost != null
          ? Number(line.unitCost)
          : Number(inventoryItem.unitCost) || 0;
      adjustmentValue += quantityChange * lineCost;
    }

    // Double-entry posting (audit A5): write-downs debit Inventory Adjustment
    // Expense / credit Inventory; write-ups the reverse. Same transaction as
    // the stock changes; idempotent per adjustment id.
    adjustmentValue = Math.round(adjustmentValue * 100) / 100;
    if (adjustmentValue !== 0) {
      await this.postingService.postInventoryAdjustment({
        adjustmentId: adjustment.id,
        amount: adjustmentValue,
        memo: `Inventory adjustment ${adjustment.adjustmentNumber} (${adjustment.reason})`,
      });
    }

    adjustment.status = AdjustmentStatus.APPROVED;
    adjustment.approvedById = approvedById || null;
    adjustment.approvedAt = new Date();
    await this.adjustmentRepository.save(adjustment);

    return this.findOne(id);
  }

  @Transactional()
  async reject(id: string, rejectedById: string) {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { id },
    });
    if (!adjustment) {
      throw new NotFoundException("Inventory adjustment not found");
    }
    if (adjustment.status !== AdjustmentStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT adjustments can be rejected (current status: ${adjustment.status})`,
      );
    }

    adjustment.status = AdjustmentStatus.REJECTED;
    adjustment.approvedById = rejectedById || null;
    adjustment.approvedAt = new Date();
    await this.adjustmentRepository.save(adjustment);

    return this.findOne(id);
  }
}
