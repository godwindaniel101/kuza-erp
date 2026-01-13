import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ example: 'Manager' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 'Department manager position', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

