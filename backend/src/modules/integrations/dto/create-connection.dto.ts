import {
  IsString,
  IsIn,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  INTEGRATION_TYPES,
  IntegrationType,
} from '../entities/integration-connection.entity';

export class CreateConnectionDto {
  @ApiProperty({ example: 'paystack', description: 'paystack | monnify | generic_pos | ...' })
  @IsString()
  @MaxLength(50)
  provider: string;

  @ApiProperty({ enum: INTEGRATION_TYPES, example: 'PAYMENTS' })
  @IsIn(INTEGRATION_TYPES)
  type: IntegrationType;

  @ApiProperty({ example: 'Paystack — main store' })
  @IsString()
  @MaxLength(120)
  label: string;

  @ApiProperty({
    required: false,
    example: { secretKey: 'sk_test_xxx' },
    description: 'Provider credentials/settings. Secret values are never returned by the API.',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
