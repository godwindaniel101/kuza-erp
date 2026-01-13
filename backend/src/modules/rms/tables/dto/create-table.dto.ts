import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  capacity: number;

  @ApiProperty({ required: false, default: 'available' })
  @IsOptional()
  @IsString()
  status?: string;
}

