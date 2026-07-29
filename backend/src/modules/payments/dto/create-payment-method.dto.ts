import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ enum: ['bank_transfer', 'card', 'mobile_money', 'ussd', 'cash'] })
  @IsIn(['bank_transfer', 'card', 'mobile_money', 'ussd', 'cash'])
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false, type: [String], description: 'Monnify bank codes to reserve; empty = all banks' })
  @IsOptional()
  @IsArray()
  preferredBanks?: string[];
}
