import { IsString, IsOptional, IsEmail, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  contactPerson?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.email !== undefined && o.email !== '')
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  address?: string;
}

