import { IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettlementDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ description: '6-digit authenticator code' })
  @IsString()
  @Length(6, 6)
  code: string;
}
