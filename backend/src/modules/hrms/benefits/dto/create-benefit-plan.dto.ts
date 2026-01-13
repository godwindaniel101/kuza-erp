import { IsString, IsNumber, IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBenefitPlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  employerContribution?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  employeeContribution?: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

