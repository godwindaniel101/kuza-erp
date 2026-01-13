import { IsString, IsDateString, IsUUID, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class InflowItemDto {
  @ApiProperty()
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty()
  @IsUUID()
  uomId: string;

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

