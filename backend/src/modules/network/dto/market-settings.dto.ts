import { IsIn, IsOptional } from 'class-validator';
import type { AvailabilityMode, VisibilityMode, StockMode } from '../entities/market-settings.entity';

export class UpdateMarketSettingsDto {
  @IsOptional()
  @IsIn(['auto_in_stock', 'manual'])
  availabilityMode?: AvailabilityMode;

  @IsOptional()
  @IsIn(['public', 'connections', 'manual'])
  visibilityMode?: VisibilityMode;

  @IsOptional()
  @IsIn(['show_cap', 'hide_allow'])
  stockMode?: StockMode;
}
