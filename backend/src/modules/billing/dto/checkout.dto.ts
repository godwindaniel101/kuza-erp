import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Start a checkout for a plan upgrade. Unlike ChangePlanDto this does NOT
 * pin the code to the four built-in plans — super-admins can create new plan
 * codes (Part A), and those must be purchasable. We only constrain the shape
 * (uppercase code); existence is validated server-side against the plans table.
 */
export class CheckoutDto {
  @ApiProperty({ example: 'GROWTH' })
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'planCode must be an uppercase plan code',
  })
  planCode: string;
}
