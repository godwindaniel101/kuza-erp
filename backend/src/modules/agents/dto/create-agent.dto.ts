import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false, description: 'friendly | professional | playful | …' })
  @IsString()
  @IsOptional()
  tone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  voice?: string;

  @ApiProperty({ required: false, type: [String], description: 'Language tags, e.g. ["en","pcm","yo"]' })
  @IsArray()
  @IsOptional()
  languages?: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  workingHours?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 2 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  systemPromptExtras?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  guardrails?: Record<string, any>;

  @ApiProperty({ required: false, enum: ['active', 'paused'] })
  @IsIn(['active', 'paused'])
  @IsOptional()
  status?: 'active' | 'paused';

  @ApiProperty({ required: false, type: [String], description: 'Enabled capability-plugin keys' })
  @IsArray()
  @IsOptional()
  enabledCapabilities?: string[];
}
