import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const TEMPLATE_KEYS = [
  'elegant',
  'minimal',
  'noir',
  'gallery',
  'bistro',
  'grand',
] as const;

export class UpdateMenuSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens only',
  })
  slug?: string;

  @IsOptional()
  @IsIn(TEMPLATE_KEYS as unknown as string[])
  templateKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  themeKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^#[0-9a-fA-F]{3,8}$/, {
    message: 'accentColor must be a hex color like #C9A227',
  })
  accentColor?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagram?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  wifiName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  wifiPassword?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  showPrices?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  menuIds?: string[];
}
