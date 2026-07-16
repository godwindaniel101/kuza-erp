import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { APP_KEYS } from '../../../common/apps/app-registry';

export class CreateAccessRequestDto {
  @ApiProperty({ example: 'invoicing', enum: APP_KEYS })
  @IsString()
  @IsIn(APP_KEYS)
  appKey: string;

  @ApiPropertyOptional({ example: 'We need invoicing for the new branch.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
