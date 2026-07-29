import { IsString, IsIn, IsOptional, IsObject, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  INTEGRATION_STATUSES,
  IntegrationStatus,
} from '../entities/integration-connection.entity';

export class UpdateConnectionDto {
  @ApiProperty({ required: false, example: 'Paystack — main store' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiProperty({ required: false, enum: INTEGRATION_STATUSES })
  @IsOptional()
  @IsIn(INTEGRATION_STATUSES)
  status?: IntegrationStatus;

  @ApiProperty({
    required: false,
    description:
      'Merged into existing config key-by-key; send a key with null to clear it.',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
