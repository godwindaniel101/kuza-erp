import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMode {
  FULL = 'full',
  PARTIAL = 'partial',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  POS = 'pos',
  CHECKOUT = 'checkout',
}

export class MarkPaidDto {
  @ApiProperty({ description: 'Payment amount', required: true })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMode, default: PaymentMode.FULL, required: false })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode;

  @ApiProperty({ enum: PaymentMethod, required: true })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Payment notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
