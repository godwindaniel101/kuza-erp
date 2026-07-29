import { IsBoolean, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { APP_KEYS } from '../../../common/apps/app-registry';

export class UpdateAppDto {
  @ApiProperty({ example: 'invoicing', enum: APP_KEYS })
  @IsString()
  @IsIn(APP_KEYS)
  key: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}
