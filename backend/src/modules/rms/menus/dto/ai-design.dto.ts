import { IsString, IsOptional, IsArray, IsObject, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiDesignDto {
  @ApiProperty({ example: 'uuid-of-menu' })
  @IsUUID()
  menu_id: string;

  @ApiProperty({ example: 'Make it modern with red colors and bold typography' })
  @IsString()
  prompt: string;

  @ApiProperty({ required: false, type: Array })
  @IsOptional()
  @IsArray()
  conversation_context?: Array<{ role: string; content: string }>;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  current_theme_settings?: any;
}
