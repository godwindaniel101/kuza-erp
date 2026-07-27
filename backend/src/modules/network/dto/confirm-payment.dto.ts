import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Supplier's resolution of a buyer's external payment claim. */
export class ConfirmPaymentDto {
  /** true = confirm the money was received (→ paid); false = dispute (→ unpaid). */
  @IsBoolean()
  accept: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
