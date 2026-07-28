import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  APP_KEYS,
  EDITION_KEYS,
  LEGACY_BUSINESS_TYPE_TO_EDITION,
} from '../../../common/apps/app-registry';

const ACCEPTED_BUSINESS_TYPES = [
  ...EDITION_KEYS,
  ...Object.keys(LEGACY_BUSINESS_TYPE_TO_EDITION),
];

/**
 * First-run onboarding: the business details collected after email verification
 * (or a new Google sign-in). The `token` proves the caller just verified their
 * email / Google identity and authorizes provisioning the tenant.
 */
export class OnboardingDto {
  @ApiProperty({ description: 'Onboarding token (from verify-email or Google)' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'My Business' })
  @IsString()
  @MinLength(2)
  businessName: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'hospitality',
    required: false,
    enum: ACCEPTED_BUSINESS_TYPES,
  })
  @IsOptional()
  @IsIn(ACCEPTED_BUSINESS_TYPES)
  businessType?: string;

  @ApiProperty({ example: 'NG', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiProperty({
    example: ['items', 'pos', 'books'],
    required: false,
    isArray: true,
    enum: APP_KEYS,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(APP_KEYS, { each: true })
  enabledApps?: string[];
}
