import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Guest-created reservation from the public menu page (no auth). */
export class CreatePublicReservationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName: string;

  @IsString()
  @MinLength(4)
  @MaxLength(40)
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  customerEmail?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  partySize: number;

  @IsDateString()
  reservationAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
