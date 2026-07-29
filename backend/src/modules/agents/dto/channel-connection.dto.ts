import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CHANNEL_TYPES = [
  'whatsapp',
  'instagram',
  'tiktok',
  'messenger',
  'telegram',
  'webchat',
] as const;

export class CreateChannelConnectionDto {
  @ApiProperty({ enum: CHANNEL_TYPES })
  @IsIn(CHANNEL_TYPES as unknown as string[])
  type: (typeof CHANNEL_TYPES)[number];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false, description: 'Channel-side id (NOT a secret)' })
  @IsString()
  @IsOptional()
  externalRef?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiProperty({
    required: false,
    description:
      'Non-secret config + credential *references* only — never raw tokens.',
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class ConnectTelegramDto {
  @ApiProperty({ description: 'BotFather token — verified, encrypted, never returned' })
  @IsString()
  botToken: string;
}

export class UpdateChannelConnectionDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
