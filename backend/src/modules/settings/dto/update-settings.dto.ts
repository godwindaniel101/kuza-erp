import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const currencies = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR', 'INR', 'AED', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'MXN'];
const languages = ['en', 'fr', 'es', 'de', 'ha'];

export class UpdateSettingsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiProperty({ required: false, enum: currencies })
  @IsIn(currencies)
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false, enum: languages })
  @IsIn(languages)
  @IsOptional()
  language?: string;
}

