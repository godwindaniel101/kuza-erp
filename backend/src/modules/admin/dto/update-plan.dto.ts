import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanLimitsDto } from './create-plan.dto';

/**
 * Super-admin: update an existing plan (by code). Every field is optional —
 * only the provided fields are changed. `code` is immutable (it is the plan's
 * stable identity, referenced by tenant subscriptions).
 */
export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Pro (2026)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 149 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPriceUsd?: number;

  @ApiPropertyOptional({ example: { NGN: 200000, USD: 149 } })
  @IsOptional()
  @IsObject()
  prices?: Record<string, number>;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: PlanLimitsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits?: PlanLimitsDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
