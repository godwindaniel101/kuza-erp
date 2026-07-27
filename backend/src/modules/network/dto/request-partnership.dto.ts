import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestPartnershipDto {
  @IsOptional()
  @IsUUID()
  supplierTenantId?: string;

  @IsOptional()
  @IsString()
  supplierSlug?: string;

  @IsOptional()
  @IsEmail()
  supplierEmail?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
