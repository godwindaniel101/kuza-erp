import { IsString, IsOptional, MinLength, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Sales' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Sales department', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  parentId?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}

