import { IsString, IsDateString, IsUUID, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class InflowItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  uomId?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitCost: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    required: false,
    example: 'A-03-2',
    description:
      'Physical row/rack ("bin") location where this line was put away; ' +
      'stored on the item\'s branch inventory row.',
  })
  @IsOptional()
  @IsString()
  binLocation?: string;

  // Fields to store original names when relations are not found
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originalItemName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originalUomName?: string;
}

export class CreateInventoryInflowDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty()
  @IsDateString()
  receivedDate: string;

  @ApiProperty({ type: [InflowItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InflowItemDto)
  items: InflowItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiProperty({ required: false, enum: ['manual', 'bulk'], default: 'manual' })
  @IsOptional()
  @IsString()
  type?: string;
}

