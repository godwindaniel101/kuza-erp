import { IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUomDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  abbreviation?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isDefault: boolean;
}

