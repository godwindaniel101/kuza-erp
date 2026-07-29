import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** One make-up (bill-of-materials) line: component item + quantity + unit. */
export class ItemComponentDto {
  @ApiProperty()
  @IsUUID()
  componentItemId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  uomId?: string;
}

export class CreateInventoryItemDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @ApiProperty()
  @IsString()
  baseUomId: string;

  @ApiProperty({ default: 0 })
  @IsNumber()
  currentStock: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  minimumStock: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  maximumStock: number;

  @ApiProperty({ default: 0, required: false })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  salePrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({
    required: false,
    example: 'A-03-2',
    description: 'Default physical row/rack ("bin") location for the item.',
  })
  @IsOptional()
  @IsString()
  binLocation?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isTrackable: boolean;

  @ApiProperty({ default: true, required: false, description: 'Offer this item for sale at POS/menu' })
  @IsOptional()
  @IsBoolean()
  sellAtPos?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  frontImage?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  additionalImages?: string[];

  @ApiProperty({ type: [ItemComponentDto], required: false, description: 'Make-up: items this item is assembled from' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemComponentDto)
  components?: ItemComponentDto[];
}

