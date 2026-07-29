import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AskCopilotDto {
  @ApiProperty({ example: 'Who owes me the most money right now?' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  question: string;

  /**
   * Optional branch to scope the answer to. When omitted, the copilot answers
   * across every branch the caller is allowed to see (and can still infer a
   * branch from the question text, e.g. "how is Lekki doing?"). A branch the
   * caller has no access to is refused gracefully in the answer, not with a 403.
   */
  @ApiPropertyOptional({
    example: 'b3f1c2a4-...',
    description: 'Branch id to scope the answer to (optional).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  branchId?: string;
}
