import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { InflowsModule } from './inflows/inflows.module';
import { UomsModule } from './uoms/uoms.module';
import { AiModule } from './ai/ai.module';
import { CategoriesModule } from './categories/categories.module';
import { UomConversionsModule } from './uom-conversions/uom-conversions.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [InventoryModule, InflowsModule, UomsModule, AiModule, CategoriesModule, UomConversionsModule, TransfersModule],
  exports: [InventoryModule, InflowsModule, UomsModule, AiModule, CategoriesModule, UomConversionsModule, TransfersModule],
})
export class ImsModule {}

