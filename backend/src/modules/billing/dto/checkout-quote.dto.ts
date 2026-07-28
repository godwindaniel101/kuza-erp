import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { APP_KEYS } from '../../../common/apps/app-registry';

/**
 * À-la-carte checkout: the apps + usage the tenant wants to subscribe to. The
 * price is computed authoritatively server-side (this DTO carries no amount).
 */
export class CheckoutQuoteDto {
  @ApiProperty({ isArray: true, enum: APP_KEYS, example: ['rms', 'invoicing'] })
  @IsArray()
  @IsString({ each: true })
  @IsIn(APP_KEYS, { each: true })
  apps: string[];

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  branches?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  users?: number;
}
