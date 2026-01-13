import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order } from '../rms/entities/order.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { Table } from '../rms/entities/table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, InventoryItem, Table])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

