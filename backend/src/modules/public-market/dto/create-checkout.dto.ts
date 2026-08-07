import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** Guest buyer details. Email is optional; name + phone are required. */
export class CheckoutBuyerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * A single cart line. Only `storeSlug`, `itemId` and `qty` are trusted from the
 * client — price and name are ALWAYS re-read server-side from the seller's
 * `inventory_items`. Any client-supplied price is intentionally not modelled.
 */
export class CheckoutItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeSlug: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateCheckoutDto {
  /** Client idempotency key — the no-double-charge guard (unique landlord-side). */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ type: CheckoutBuyerDto })
  @ValidateNested()
  @Type(() => CheckoutBuyerDto)
  buyer: CheckoutBuyerDto;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
