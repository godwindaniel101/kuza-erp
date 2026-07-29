import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

const DOC_TYPES = ['faq', 'policy', 'catalog', 'freeform'] as const;

export class CreateKnowledgeDocDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: DOC_TYPES, required: false })
  @IsIn(DOC_TYPES as unknown as string[])
  @IsOptional()
  type?: (typeof DOC_TYPES)[number];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ required: false, description: 'null = shared across all agents' })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceRef?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;
}

export class UpdateKnowledgeDocDto extends PartialType(CreateKnowledgeDocDto) {}
