import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Price adjustment a supplier may apply to an existing line when accepting an
 * order. `id` targets an existing NetworkOrderItem row.
 */
export class OrderActionItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

/**
 * Payload for any status-transition action. `note` is recorded on the status
 * history entry; `items` (supplier accept only) carries adjusted unit prices.
 */
export class OrderActionDto {
  @IsOptional()
  @IsString()
  note?: string;

  /** Supplier accept: the branch to fulfil (debit stock) from. */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderActionItemDto)
  items?: OrderActionItemDto[];
}
