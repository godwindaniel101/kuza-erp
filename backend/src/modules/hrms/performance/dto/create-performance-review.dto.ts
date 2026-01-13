import { IsString, IsDateString, IsUUID, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PerformanceGoalDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  targetValue?: number;
}

class PerformanceRatingDto {
  @ApiProperty()
  @IsString()
  criteria: string;

  @ApiProperty()
  @IsNumber()
  rating: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreatePerformanceReviewDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsString()
  reviewPeriod: string;

  @ApiProperty()
  @IsDateString()
  reviewDate: string;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty()
  @IsUUID()
  reviewedBy: string;

  @ApiProperty({ type: [PerformanceGoalDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceGoalDto)
  goals?: PerformanceGoalDto[];

  @ApiProperty({ type: [PerformanceRatingDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceRatingDto)
  ratings?: PerformanceRatingDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  areasForImprovement?: string;
}

