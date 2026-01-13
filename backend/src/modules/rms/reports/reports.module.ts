import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Branch } from '../../../common/entities/branch.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { InventoryItem } from '../../ims/entities/inventory-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, Order, OrderItem, InventoryItem]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

