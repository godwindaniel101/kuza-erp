import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateMenuDto } from './create-menu.dto';

export class UpdateMenuDto extends PartialType(CreateMenuDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  themeSettings?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateId?: string;
}

