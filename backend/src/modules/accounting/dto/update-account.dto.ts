import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Only name/description/isActive are mutable; code/type are fixed at creation. */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
