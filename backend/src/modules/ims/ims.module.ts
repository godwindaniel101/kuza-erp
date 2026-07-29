import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { InflowsModule } from './inflows/inflows.module';
import { UomsModule } from './uoms/uoms.module';
import { AiModule } from './ai/ai.module';
import { CategoriesModule } from './categories/categories.module';
import { UomConversionsModule } from './uom-conversions/uom-conversions.module';
import { TransfersModule } from './transfers/transfers.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { AdjustmentsModule } from './adjustments/adjustments.module';

@Module({
  imports: [InventoryModule, InflowsModule, UomsModule, AiModule, CategoriesModule, UomConversionsModule, TransfersModule, StockMovementsModule, AdjustmentsModule],
  exports: [InventoryModule, InflowsModule, UomsModule, AiModule, CategoriesModule, UomConversionsModule, TransfersModule, StockMovementsModule, AdjustmentsModule],
})
export class ImsModule {}
