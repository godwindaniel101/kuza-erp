import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Body for POST /auth/api-token/exchange — trade a Kuza API token for a JWT. */
export class ExchangeApiTokenDto {
  @ApiProperty({ example: 'kuza_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

/** Body for POST /auth/api-token — issue/rotate the current user's token. */
export class IssueApiTokenDto {
  @ApiPropertyOptional({
    example: 'Claude Desktop MCP',
    description: 'Optional human-readable label to recognise this token later.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
