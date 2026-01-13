import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryInflow } from '../entities/inventory-inflow.entity';
import { InventoryInflowItem } from '../entities/inventory-inflow-item.entity';
import { OrderItem } from '../../rms/entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryInflow,
      InventoryInflowItem,
      OrderItem,
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

