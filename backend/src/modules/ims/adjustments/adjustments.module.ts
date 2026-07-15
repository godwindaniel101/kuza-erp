import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdjustmentsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';
import { InventoryAdjustment } from '../entities/inventory-adjustment.entity';
import { InventoryAdjustmentItem } from '../entities/inventory-adjustment-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { AccountingModule } from '../../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryAdjustment,
      InventoryAdjustmentItem,
      InventoryItem,
      BranchInventoryItem,
    ]),
    StockMovementsModule,
    AccountingModule,
  ],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
