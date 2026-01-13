import { Module } from '@nestjs/common';
import { MenusModule } from './menus/menus.module';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [MenusModule, OrdersModule, TablesModule, SuppliersModule, ReportsModule],
  exports: [MenusModule, OrdersModule, TablesModule, SuppliersModule, ReportsModule],
})
export class RmsModule {}

