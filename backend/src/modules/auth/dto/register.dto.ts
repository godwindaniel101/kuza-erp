import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsIn,
  IsArray,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  APP_KEYS,
  EDITION_KEYS,
  LEGACY_BUSINESS_TYPE_TO_EDITION,
} from '../../../common/apps/app-registry';

/**
 * Canonical editions plus the legacy values older clients still send;
 * legacy values are normalized to their edition at write time
 * (auth.service → normalizeBusinessType).
 */
const ACCEPTED_BUSINESS_TYPES = [
  ...EDITION_KEYS,
  ...Object.keys(LEGACY_BUSINESS_TYPE_TO_EDITION),
];

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  passwordConfirmation: string;

  @ApiProperty({ example: 'My Business', required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({
    example: 'hospitality',
    required: false,
    enum: ACCEPTED_BUSINESS_TYPES,
    description:
      'Product edition: hospitality | accounts | retail | hr | warehouse. ' +
      'Legacy values (restaurant, services, general) are still accepted ' +
      'and normalized to their edition.',
  })
  @IsOptional()
  @IsIn(ACCEPTED_BUSINESS_TYPES)
  businessType?: string;

  @ApiProperty({
    example: ['items', 'pos', 'books'],
    required: false,
    description:
      'Canonical app keys to enable for the new business. Omitted → the ' +
      'businessType preset. Dependencies are auto-included on save.',
    isArray: true,
    enum: APP_KEYS,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(APP_KEYS, { each: true })
  enabledApps?: string[];

  @ApiProperty({
    example: 'NG',
    required: false,
    description:
      'ISO-3166 alpha-2 country code. Sets the business currency — plans ' +
      'and prices are shown and billed in it (local-first pricing).',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

