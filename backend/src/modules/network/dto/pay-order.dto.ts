import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Settle a purchase order. `wallet` = internal IOU transfer (debit buyer /
 * credit supplier); `mark_paid` = record external/off-platform settlement with
 * no wallet movement.
 */
export class PayOrderDto {
  @IsIn(['wallet', 'mark_paid'])
  method: 'wallet' | 'mark_paid';

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
