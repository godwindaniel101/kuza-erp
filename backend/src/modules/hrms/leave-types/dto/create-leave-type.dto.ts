import { IsString, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveTypeDto {
  @ApiProperty({ example: 'Annual Leave' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ANNUAL' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ example: 'Annual vacation leave', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber()
  maxDaysPerYear?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  accrues?: boolean;

  @ApiProperty({ example: 1.67, required: false })
  @IsOptional()
  @IsNumber()
  accrualRate?: number;

  @ApiProperty({ example: 'monthly', required: false })
  @IsOptional()
  @IsString()
  accrualFrequency?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  carryOverAllowed?: boolean;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  maxCarryOverDays?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  requiresDocument?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  halfDayAllowed?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

