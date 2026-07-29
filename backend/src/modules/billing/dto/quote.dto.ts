import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { APP_KEYS } from '../../../common/apps/app-registry';

/**
 * À-la-carte quote request: the apps a tenant wants + their branch/user counts.
 * The price is computed in the tenant's currency server-side.
 */
export class QuoteDto {
  @ApiProperty({ isArray: true, enum: APP_KEYS, example: ['rms', 'invoicing'] })
  @IsArray()
  @IsString({ each: true })
  @IsIn(APP_KEYS, { each: true })
  apps: string[];

  @ApiProperty({ required: false, example: 2, description: 'Total branches' })
  @IsOptional()
  @IsInt()
  @Min(0)
  branches?: number;

  @ApiProperty({ required: false, example: 5, description: 'Total users/seats' })
  @IsOptional()
  @IsInt()
  @Min(0)
  users?: number;
}
