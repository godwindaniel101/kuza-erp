import { IsString, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalaryStructureDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;
}

