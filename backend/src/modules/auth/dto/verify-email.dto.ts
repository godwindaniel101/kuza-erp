import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Signed verification token from the email link' })
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsString()
  email: string;
}
