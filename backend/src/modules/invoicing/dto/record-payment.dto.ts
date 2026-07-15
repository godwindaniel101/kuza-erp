import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsDateString,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  INVOICE_PAYMENT_METHODS,
  InvoicePaymentMethod,
} from '../entities/invoice-payment.entity';

export class RecordPaymentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: INVOICE_PAYMENT_METHODS })
  @IsIn(INVOICE_PAYMENT_METHODS)
  method: InvoicePaymentMethod;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: '2026-07-11' })
  @IsDateString()
  date: string;
}
