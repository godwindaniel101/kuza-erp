import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const STOREFRONT_TEMPLATE_KEYS = ['grid', 'list', 'showcase'] as const;

export class UpdateStorefrontDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens only',
  })
  slug?: string;

  @IsOptional()
  @IsIn(STOREFRONT_TEMPLATE_KEYS as unknown as string[])
  templateKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^#[0-9a-fA-F]{3,8}$/, {
    message: 'accentColor must be a hex color like #C9A227',
  })
  accentColor?: string | null;

  @IsOptional()
  @IsBoolean()
  showPrices?: boolean;

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
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}
