import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ default: true })
  @IsBoolean()
  isTrackable: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  frontImage?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  additionalImages?: string[];
}

