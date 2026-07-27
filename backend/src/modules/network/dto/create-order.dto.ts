import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  description: string;

  /**
   * The supplier's inventory item this line maps to (from the catalog listing's
   * sourceInventoryItemId). Lets the supplier fulfil + debit real stock on accept.
   */
  @IsOptional()
  @IsUUID()
  sourceInventoryItemId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  supplierTenantId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsString()
  supplierName: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  /** false = save as draft; anything else (or omitted) = submit as requested. */
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
