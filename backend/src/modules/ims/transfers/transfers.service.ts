import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryTransfer } from '../entities/inventory-transfer.entity';
import { InventoryTransferItem } from '../entities/inventory-transfer-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { Uom } from '../entities/uom.entity';
import { CreateInventoryTransferDto, UpdateTransferStatusDto, ReceiveTransferItemDto } from './dto/create-transfer.dto';
import { UomConversionsService } from '../uom-conversions/uom-conversions.service';

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
    private uomConversionsService: UomConversionsService,
    private dataSource: DataSource,
  ) {}

  async create(businessId: string, userId: string, createDto: CreateInventoryTransferDto) {
    if (createDto.fromBranchId === createDto.toBranchId) {
      throw new BadRequestException('Source and destination branches cannot be the same');
    }

    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException('Transfer must contain at least one item');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate transfer number
      const transferNumber = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const transfer = this.transferRepository.create({
        businessId,
        fromBranchId: createDto.fromBranchId,
        toBranchId: createDto.toBranchId,
        transferNumber,
        transferDate: new Date(createDto.transferDate),
        status: 'pending',
        notes: createDto.notes,
        initiatedBy: userId,
      });

      const savedTransfer = await queryRunner.manager.save(InventoryTransfer, transfer);

      // Process each item
      for (const itemDto of createDto.items) {
        const inventoryItem = await queryRunner.manager.findOne(InventoryItem, {
          where: { id: itemDto.inventoryItemId, businessId },
        });

        if (!inventoryItem) {
          throw new NotFoundException(`Inventory item ${itemDto.inventoryItemId} not found`);
        }

        // Get source branch inventory
        const sourceBranchInventory = await queryRunner.manager.findOne(BranchInventoryItem, {
          where: {
            branchId: createDto.fromBranchId,
            inventoryItemId: itemDto.inventoryItemId,
          },
        });

        if (!sourceBranchInventory) {
          throw new NotFoundException(`Item not available in source branch`);
        }

        // Convert quantity to base UOM for stock check
        let baseQuantity = itemDto.quantity;
        if (itemDto.uomId !== inventoryItem.baseUomId) {
          baseQuantity = await this.uomConversionsService.convert(
            businessId,
            itemDto.uomId,
            inventoryItem.baseUomId,
            itemDto.quantity,
          );
        }

        const baseUom = await queryRunner.manager.findOne(Uom, { where: { id: inventoryItem.baseUomId } });
        if (Number(sourceBranchInventory.currentStock) < baseQuantity) {
          throw new BadRequestException(
            `Insufficient stock for ${inventoryItem.name}. Available: ${sourceBranchInventory.currentStock} ${baseUom?.name || 'units'}, Requested: ${baseQuantity}`,
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

        await queryRunner.manager.save(InventoryTransferItem, transferItem);
      }

      await queryRunner.commitTransaction();
      return await this.findOne(savedTransfer.id, businessId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(businessId: string, branchId?: string) {
    const query = this.transferRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromBranch', 'fromBranch')
      .leftJoinAndSelect('transfer.toBranch', 'toBranch')
      .where('transfer.businessId = :businessId', { businessId })
      .orderBy('transfer.transferDate', 'DESC')
      .addOrderBy('transfer.createdAt', 'DESC');

    if (branchId) {
      query.andWhere('(transfer.fromBranchId = :branchId OR transfer.toBranchId = :branchId)', { branchId });
    }

    return await query.getMany();
  }

  async findOne(id: string, businessId: string) {
    const transfer = await this.transferRepository.findOne({
      where: { id, businessId },
      relations: ['fromBranch', 'toBranch', 'items', 'items.inventoryItem', 'items.inventoryItem.baseUom', 'items.uom'],
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async updateStatus(id: string, businessId: string, userId: string, updateDto: UpdateTransferStatusDto) {
    const transfer = await this.findOne(id, businessId);

    if (transfer.status === 'cancelled') {
      throw new BadRequestException('Cannot update status of cancelled transfer');
    }

    if (transfer.status === 'received' && updateDto.status !== 'cancelled') {
      throw new BadRequestException('Cannot update status of completed transfer');
    }

    if (updateDto.status === 'received' && transfer.status !== 'in_transit') {
      throw new BadRequestException('Only in-transit transfers can be marked as received');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (updateDto.status === 'in_transit') {
        // Deduct stock from source branch
        for (const item of transfer.items) {
          const inventoryItem = await queryRunner.manager.findOne(InventoryItem, {
            where: { id: item.inventoryItemId },
          });

          let baseQuantity = item.quantity;
          if (item.uomId !== inventoryItem.baseUomId) {
            baseQuantity = await this.uomConversionsService.convert(
              businessId,
              item.uomId,
              inventoryItem.baseUomId,
              item.quantity,
            );
          }

          const sourceBranchInventory = await queryRunner.manager.findOne(BranchInventoryItem, {
            where: {
              branchId: transfer.fromBranchId,
              inventoryItemId: item.inventoryItemId,
            },
          });

          if (sourceBranchInventory) {
            sourceBranchInventory.currentStock = Math.max(
              0,
              Number(sourceBranchInventory.currentStock) - baseQuantity,
            );
            await queryRunner.manager.save(BranchInventoryItem, sourceBranchInventory);
          }

          // Update main inventory stock
          inventoryItem.currentStock = Math.max(0, Number(inventoryItem.currentStock) - baseQuantity);
          await queryRunner.manager.save(InventoryItem, inventoryItem);
        }
      } else if (updateDto.status === 'received') {
        // Add stock to destination branch
        transfer.receivedBy = userId;
        transfer.receivedAt = new Date();

        for (const item of transfer.items) {
          const inventoryItem = await queryRunner.manager.findOne(InventoryItem, {
            where: { id: item.inventoryItemId },
          });

          const receivedQty = item.receivedQuantity || item.quantity;
          let baseQuantity = receivedQty;
          if (item.uomId !== inventoryItem.baseUomId) {
            baseQuantity = await this.uomConversionsService.convert(
              businessId,
              item.uomId,
              inventoryItem.baseUomId,
              receivedQty,
            );
          }

          let destBranchInventory = await queryRunner.manager.findOne(BranchInventoryItem, {
            where: {
              branchId: transfer.toBranchId,
              inventoryItemId: item.inventoryItemId,
            },
          });

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

          destBranchInventory.currentStock = Number(destBranchInventory.currentStock) + baseQuantity;
          await queryRunner.manager.save(BranchInventoryItem, destBranchInventory);

          // Update main inventory stock
          inventoryItem.currentStock = Number(inventoryItem.currentStock) + baseQuantity;
          await queryRunner.manager.save(InventoryItem, inventoryItem);

          // Update received quantity
          item.receivedQuantity = item.receivedQuantity || item.quantity;
          await queryRunner.manager.save(InventoryTransferItem, item);
        }
      } else if (updateDto.status === 'cancelled') {
        // If cancelled from in_transit, restore stock to source branch
        if (transfer.status === 'in_transit') {
          for (const item of transfer.items) {
            const inventoryItem = await queryRunner.manager.findOne(InventoryItem, {
              where: { id: item.inventoryItemId },
            });

            const baseQuantity = await this.uomConversionsService.convert(
              businessId,
              item.uomId,
              inventoryItem.baseUomId,
              item.quantity,
            );

            const sourceBranchInventory = await queryRunner.manager.findOne(BranchInventoryItem, {
              where: {
                branchId: transfer.fromBranchId,
                inventoryItemId: item.inventoryItemId,
              },
            });

            if (sourceBranchInventory) {
              sourceBranchInventory.currentStock = Number(sourceBranchInventory.currentStock) + baseQuantity;
              await queryRunner.manager.save(BranchInventoryItem, sourceBranchInventory);
            }

            inventoryItem.currentStock = Number(inventoryItem.currentStock) + baseQuantity;
            await queryRunner.manager.save(InventoryItem, inventoryItem);
          }
        }
      }

      transfer.status = updateDto.status;
      await queryRunner.manager.save(InventoryTransfer, transfer);

      await queryRunner.commitTransaction();
      return await this.findOne(id, businessId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async receiveItems(id: string, businessId: string, userId: string, items: ReceiveTransferItemDto[]) {
    const transfer = await this.findOne(id, businessId);

    if (transfer.status !== 'in_transit') {
      throw new BadRequestException('Can only receive items for in-transit transfers');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      transfer.receivedBy = userId;
      transfer.receivedAt = new Date();

      for (const receiveItem of items) {
        const transferItem = transfer.items.find((item) => item.id === receiveItem.itemId);
        if (!transferItem) {
          throw new NotFoundException(`Transfer item ${receiveItem.itemId} not found`);
        }

        if (receiveItem.receivedQuantity > transferItem.quantity) {
          throw new BadRequestException(
            `Received quantity cannot exceed transferred quantity for ${transferItem.inventoryItem.name}`,
          );
        }

        const inventoryItem = await queryRunner.manager.findOne(InventoryItem, {
          where: { id: transferItem.inventoryItemId },
        });

        let baseQuantity = receiveItem.receivedQuantity;
        if (transferItem.uomId !== inventoryItem.baseUomId) {
          baseQuantity = await this.uomConversionsService.convert(
            businessId,
            transferItem.uomId,
            inventoryItem.baseUomId,
            receiveItem.receivedQuantity,
          );
        }

        let destBranchInventory = await queryRunner.manager.findOne(BranchInventoryItem, {
          where: {
            branchId: transfer.toBranchId,
            inventoryItemId: transferItem.inventoryItemId,
          },
        });

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

        destBranchInventory.currentStock = Number(destBranchInventory.currentStock) + baseQuantity;
        await queryRunner.manager.save(BranchInventoryItem, destBranchInventory);

        inventoryItem.currentStock = Number(inventoryItem.currentStock) + baseQuantity;
        await queryRunner.manager.save(InventoryItem, inventoryItem);

        transferItem.receivedQuantity = receiveItem.receivedQuantity;
        if (receiveItem.notes) {
          transferItem.notes = receiveItem.notes;
        }
        await queryRunner.manager.save(InventoryTransferItem, transferItem);
      }

      // Check if all items are fully received
      const allReceived = transfer.items.every((item) => {
        const receiveItem = items.find((ri) => ri.itemId === item.id);
        const receivedQty = receiveItem?.receivedQuantity || item.receivedQuantity || 0;
        return receivedQty >= item.quantity;
      });

      if (allReceived) {
        transfer.status = 'received';
      }

      await queryRunner.manager.save(InventoryTransfer, transfer);

      await queryRunner.commitTransaction();
      return await this.findOne(id, businessId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, businessId: string) {
    const transfer = await this.findOne(id, businessId);

    if (transfer.status === 'in_transit' || transfer.status === 'received') {
      throw new BadRequestException('Cannot delete in-transit or received transfers');
    }

    await this.transferRepository.remove(transfer);
    return { success: true };
  }
}

