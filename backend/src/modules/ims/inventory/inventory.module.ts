import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { Uom } from '../entities/uom.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { InventoryCategory } from '../entities/inventory-category.entity';
import { InventorySubcategory } from '../entities/inventory-subcategory.entity';
import { UomConversionsModule } from '../uom-conversions/uom-conversions.module';
import { OrderItem } from '../../rms/entities/order-item.entity';
import { Order } from '../../rms/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      BranchInventoryItem,
      InventoryBatch,
      Uom,
      Branch,
      InventoryCategory,
      InventorySubcategory,
      OrderItem,
      Order,
    ]),
    UomConversionsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
