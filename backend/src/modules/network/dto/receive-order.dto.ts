import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Buyer confirms receipt of a purchase order — advances it to `received` and
 * links the inventory inflow it materialized into. Stock is booked through the
 * robust "Receive Stock" (Purchases) flow, which creates the inflow and then
 * calls this to link + conclude. `inflowId` is the created inflow's id (the
 * purchase bridge / idempotency guard); omit it to just mark received.
 */
export class ReceiveOrderDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  inflowId?: string;
}
