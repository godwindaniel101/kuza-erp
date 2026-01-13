import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InflowsController } from './inflows.controller';
import { InflowsService } from './inflows.service';
import { InventoryInflow } from '../entities/inventory-inflow.entity';
import { InventoryInflowItem } from '../entities/inventory-inflow-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { BranchInventoryItem } from '../entities/branch-inventory-item.entity';
import { BulkUploadLog } from '../entities/bulk-upload-log.entity';
import { UomConversionsModule } from '../uom-conversions/uom-conversions.module';
import { Restaurant } from '../../../common/entities/restaurant.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { Supplier } from '../../rms/entities/supplier.entity';
import { Uom } from '../entities/uom.entity';
import { OrderItemInflowItem } from '../../rms/entities/order-item-inflow-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryInflow,
      InventoryInflowItem,
      InventoryItem,
      InventoryBatch,
      BranchInventoryItem,
      BulkUploadLog,
      Restaurant,
      Branch,
      Supplier,
      Uom,
      OrderItemInflowItem,
    ]),
    UomConversionsModule,
  ],
  controllers: [InflowsController],
  providers: [InflowsService],
  exports: [InflowsService],
})
export class InflowsModule {}

