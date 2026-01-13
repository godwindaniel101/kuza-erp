import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { InventoryTransfer } from '../entities/inventory-transfer.entity';
import { InventoryTransferItem } from '../entities/inventory-transfer-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { Uom } from '../entities/uom.entity';
import { UomConversionsModule } from '../uom-conversions/uom-conversions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryTransfer, InventoryTransferItem, InventoryItem, BranchInventoryItem, Uom]),
    forwardRef(() => UomConversionsModule),
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}

