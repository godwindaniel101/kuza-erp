import { IsString, IsDateString, IsUUID, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobPostingDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  closingDate?: string;

  @ApiProperty({ required: false, default: 'open' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  openings: number;
}

