import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceLineDto {
  @ApiProperty({ required: false, description: 'Optional inventory item id' })
  @IsUUID()
  @IsOptional()
  itemId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ required: false, description: 'Tax rate percent, e.g. 7.5' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false, description: 'Absolute discount amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: '2026-07-11' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2026-08-11' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ required: false, default: 'NGN' })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];
}
