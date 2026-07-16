import { IsBoolean, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { APP_KEYS } from '../../../common/apps/app-registry';

/**
 * Super-admin: enable/disable a single app for a specific tenant.
 * Mirrors the tenant-facing UpdateAppDto but uses `appKey` to match the
 * /admin request contract.
 */
export class SetTenantAppDto {
  @ApiProperty({ example: 'invoicing', enum: APP_KEYS })
  @IsString()
  @IsIn(APP_KEYS)
  appKey: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}
