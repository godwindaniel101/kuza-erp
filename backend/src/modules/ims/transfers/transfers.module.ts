import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { InventoryTransfer } from '../entities/inventory-transfer.entity';
import { InventoryTransferItem } from '../entities/inventory-transfer-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { Uom } from '../entities/uom.entity';
import { InventoryInflow } from '../entities/inventory-inflow.entity';
import { InventoryInflowItem } from '../entities/inventory-inflow-item.entity';
import { UomConversionsModule } from '../uom-conversions/uom-conversions.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryTransfer, InventoryTransferItem, InventoryItem, BranchInventoryItem, Uom, InventoryInflow, InventoryInflowItem]),
    forwardRef(() => UomConversionsModule),
    StockMovementsModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}

