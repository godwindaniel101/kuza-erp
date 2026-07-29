import { IsEmail, IsOptional, IsString } from 'class-validator';

export class InviteSupplierDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
