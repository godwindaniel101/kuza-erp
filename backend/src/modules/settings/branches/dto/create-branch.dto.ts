import { IsString, IsOptional, IsBoolean, IsEmail, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return false;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return Boolean(value);
  })
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return true;
    if (typeof value === 'string') return value !== 'false' && value !== '0';
    return value !== false;
  })
  @IsBoolean()
  isActive?: boolean;
}

