import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { StockMovementType } from "../../entities/stock-movement.entity";

export class QueryStockMovementsDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  /** One or more branch ids, comma-separated (multi-select filter). */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(Object.values(StockMovementType))
  type?: StockMovementType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
