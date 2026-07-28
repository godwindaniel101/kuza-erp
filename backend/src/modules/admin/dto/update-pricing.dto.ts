import { IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Super-admin: update the platform à-la-carte pricing config.
 *
 * The nested per-currency price maps are validated in the service
 * (BillingService.updatePricingConfig) against the app registry + currency
 * list — known app keys, known currencies, non-negative prices, and assists
 * forced to 0 — because that vocabulary lives with the pricing engine, not the
 * DTO (same split as CreatePlanDto's `modules`). Here we only assert the
 * top-level shape. Every field is optional (partial merge).
 */
export class UpdatePricingDto {
  @ApiPropertyOptional({
    description: 'Partial map of appKey → (currency → monthly price)',
    example: { items: { NGN: 15000, USD: 10 } },
  })
  @IsOptional()
  @IsObject()
  appPrices?: Record<string, Record<string, number>>;

  @ApiPropertyOptional({
    description: 'Partial map of usage unit (branch/user) → (currency → price)',
    example: { branch: { NGN: 9000 }, user: { NGN: 3000 } },
  })
  @IsOptional()
  @IsObject()
  usagePrices?: {
    branch?: Record<string, number>;
    user?: Record<string, number>;
  };

  @ApiPropertyOptional({ example: 1, description: 'Branches included before add-ons' })
  @IsOptional()
  @IsInt()
  @Min(0)
  includedBranches?: number;

  @ApiPropertyOptional({ example: 3, description: 'Users included before add-ons' })
  @IsOptional()
  @IsInt()
  @Min(0)
  includedUsers?: number;
}
