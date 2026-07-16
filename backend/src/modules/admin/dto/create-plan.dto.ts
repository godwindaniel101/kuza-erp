import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Super-admin: plan limits. `modules` is validated in the service against the
 * canonical app keys + legacy plan-module keys (BillingService.assertValidModules),
 * not here, because the accepted vocabulary lives in the app registry.
 */
export class PlanLimitsDto {
  @ApiProperty({ example: 10, description: '-1 for unlimited' })
  @IsInt()
  @Min(-1)
  maxUsers: number;

  @ApiProperty({ example: 3, description: '-1 for unlimited' })
  @IsInt()
  @Min(-1)
  maxBranches: number;

  @ApiProperty({ example: 1000, description: '-1 for unlimited' })
  @IsInt()
  @Min(-1)
  maxItems: number;

  @ApiProperty({ example: ['ims', 'rms'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  modules: string[];
}

/** Super-admin: create a new plan. */
export class CreatePlanDto {
  @ApiProperty({ example: 'PRO' })
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, { message: 'code must be uppercase alphanumeric' })
  code: string;

  @ApiProperty({ example: 'Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 149 })
  @IsNumber()
  @Min(0)
  monthlyPriceUsd: number;

  @ApiPropertyOptional({
    example: { NGN: 200000, USD: 149 },
    description: 'Fixed local-first price per billing currency',
  })
  @IsOptional()
  @IsObject()
  prices?: Record<string, number>;

  @ApiPropertyOptional({ example: 'For scaling teams.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: PlanLimitsDto })
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits: PlanLimitsDto;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
