import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Supplier marks an accepted order "in transit" and picks how it's being
 * delivered. Method-specific fields are all optional.
 */
export class ShipOrderDto {
  @IsIn(['shipment', 'pickup', 'dispatch'])
  deliveryMethod: 'shipment' | 'pickup' | 'dispatch';

  @IsOptional()
  @IsString()
  note?: string;

  // shipment
  @IsOptional()
  @IsString()
  shipmentCompany?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  // dispatch
  @IsOptional()
  @IsString()
  riderName?: string;

  @IsOptional()
  @IsString()
  riderPhone?: string;

  // pickup
  @IsOptional()
  @IsString()
  pickupContact?: string;
}
