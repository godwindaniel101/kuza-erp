import { IsUUID, IsDateString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeBenefitDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty()
  @IsDateString()
  enrollmentDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  coverageAmount?: number;
}

