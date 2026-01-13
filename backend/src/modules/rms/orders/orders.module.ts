import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderPayment } from '../entities/order-payment.entity';
import { OrderItemInflowItem } from '../entities/order-item-inflow-item.entity';
import { InventoryItem } from '../../ims/entities/inventory-item.entity';
import { InventoryInflowItem } from '../../ims/entities/inventory-inflow-item.entity';
import { BranchInventoryItem } from '../../ims/entities/branch-inventory-item.entity';
import { UomConversionsModule } from '../../ims/uom-conversions/uom-conversions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderPayment,
      OrderItemInflowItem,
      InventoryItem,
      InventoryInflowItem,
      BranchInventoryItem,
    ]),
    UomConversionsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
