import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskCopilotDto {
  @ApiProperty({ example: 'Who owes me the most money right now?' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  question: string;
}
