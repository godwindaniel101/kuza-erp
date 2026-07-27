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
import { BranchUser } from '../../../common/entities/branch-user.entity';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryTransfer, InventoryTransferItem, InventoryItem, BranchInventoryItem, Uom, InventoryInflow, InventoryInflowItem, BranchUser]),
    forwardRef(() => UomConversionsModule),
    StockMovementsModule,
    NotificationsModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}

