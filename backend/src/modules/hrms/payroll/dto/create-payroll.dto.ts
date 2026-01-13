import { IsString, IsDateString, IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PayrollItemDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ default: true })
  isEarning: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePayrollDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsString()
  payPeriod: string;

  @ApiProperty()
  @IsDateString()
  payPeriodStart: string;

  @ApiProperty()
  @IsDateString()
  payPeriodEnd: string;

  @ApiProperty()
  @IsDateString()
  payDate: string;

  @ApiProperty({ type: [PayrollItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollItemDto)
  items?: PayrollItemDto[];

  @ApiProperty({ required: false, default: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

