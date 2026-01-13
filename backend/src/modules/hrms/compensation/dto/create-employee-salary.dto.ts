import { IsUUID, IsNumber, IsDateString, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeSalaryDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  structureId?: string;

  @ApiProperty()
  @IsNumber()
  baseSalary: number;

  @ApiProperty({ required: false, type: 'object' })
  @IsOptional()
  @IsObject()
  allowances?: Record<string, number>;

  @ApiProperty({ required: false, type: 'object' })
  @IsOptional()
  @IsObject()
  deductions?: Record<string, number>;

  @ApiProperty()
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;
}

