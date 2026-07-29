import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateReservationDto } from './create-reservation.dto';

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
] as const;

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @IsOptional()
  @IsIn(RESERVATION_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tableLabel?: string;
}

/** Dedicated status transition (e.g. confirm + assign a table). */
export class UpdateStatusDto {
  @IsIn(RESERVATION_STATUSES as unknown as string[])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tableLabel?: string;
}
