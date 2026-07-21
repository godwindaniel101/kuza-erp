import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdjustmentsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';
import { InventoryAdjustment } from '../entities/inventory-adjustment.entity';
import { InventoryAdjustmentItem } from '../entities/inventory-adjustment-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { InventoryInflow } from '../entities/inventory-inflow.entity';
import { InventoryInflowItem } from '../entities/inventory-inflow-item.entity';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { AccountingModule } from '../../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryAdjustment,
      InventoryAdjustmentItem,
      InventoryItem,
      BranchInventoryItem,
      InventoryInflow,
      InventoryInflowItem,
    ]),
    StockMovementsModule,
    AccountingModule,
  ],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
