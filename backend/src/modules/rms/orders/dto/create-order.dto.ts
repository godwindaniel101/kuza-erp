import { IsString, IsArray, ValidateNested, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty()
  @IsString()
  inventoryItemId: string;

  @ApiProperty()
  @IsString()
  uomId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ enum: ['dine_in', 'takeaway', 'delivery'], default: 'dine_in' })
  @IsEnum(['dine_in', 'takeaway', 'delivery'])
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  applyVat?: boolean;

  @ApiProperty({ required: false, default: 7.5 })
  @IsOptional()
  @IsNumber()
  vatPercentage?: number;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

