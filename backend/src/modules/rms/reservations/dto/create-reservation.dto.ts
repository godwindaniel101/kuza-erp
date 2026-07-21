import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Staff-created reservation. */
export class CreateReservationDto {
  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  customerEmail?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  partySize: number;

  /** ISO datetime, e.g. 2026-07-25T19:30:00.000Z */
  @IsDateString()
  reservationAt: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(600)
  durationMins?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tableLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
