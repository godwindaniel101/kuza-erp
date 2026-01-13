import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiProperty({ required: false, enum: ['user', 'employee'], default: 'user' })
  @IsEnum(['user', 'employee'])
  @IsOptional()
  type?: 'user' | 'employee';
}

