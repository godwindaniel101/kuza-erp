import { IsString, IsOptional, IsIn, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CHANNEL_TYPES = [
  'whatsapp',
  'instagram',
  'tiktok',
  'messenger',
  'telegram',
  'webchat',
] as const;

/**
 * Drive the READ-ONLY runtime with a single inbound customer message. Used by
 * the "test/preview" surface and (later) the channel webhooks. `message` is
 * UNTRUSTED customer text.
 */
export class InboundMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  message: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ enum: CHANNEL_TYPES, required: false })
  @IsIn(CHANNEL_TYPES as unknown as string[])
  @IsOptional()
  channel?: (typeof CHANNEL_TYPES)[number];

  @ApiProperty({ required: false, description: 'Channel-side customer id (UNTRUSTED)' })
  @IsString()
  @IsOptional()
  customerExternalId?: string;
}

/** A human operator's reply on a conversation they have taken over. */
export class HumanReplyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  message: string;
}
