import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { StockMovement } from '../entities/stock-movement.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement, InventoryItem])],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
