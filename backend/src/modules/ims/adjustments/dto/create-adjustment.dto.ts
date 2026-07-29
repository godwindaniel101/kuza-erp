import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  AdjustmentReason,
  AdjustmentStatus,
} from "../../entities/inventory-adjustment.entity";

export class CreateAdjustmentItemDto {
  @IsUUID()
  itemId: string;

  /** Signed change in base UOM: positive = stock in, negative = stock out. */
  @IsNumber({ maxDecimalPlaces: 2 })
  quantityChange: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateAdjustmentDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsIn(Object.values(AdjustmentReason))
  reason: AdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAdjustmentItemDto)
  items: CreateAdjustmentItemDto[];
}

export class QueryAdjustmentsDto {
  @IsOptional()
  @IsIn(Object.values(AdjustmentStatus))
  status?: AdjustmentStatus;

  @IsOptional()
  @IsIn(Object.values(AdjustmentReason))
  reason?: AdjustmentReason;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
