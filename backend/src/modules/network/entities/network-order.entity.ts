import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Kuza Network purchase order ("order request from supplier") — LANDLORD-scoped
 * (lives in the landlord database, shared across all tenants; registered on the
 * 'landlord' connection in landlord.module.ts, mirroring Phase 0's
 * NetworkBusiness / TradePartnership).
 *
 * One row per cross-tenant purchase order. It is deliberately landlord-scoped
 * because BOTH parties read it: the buyer tenant that raised the request and
 * the supplier tenant that fulfils it. When the supplier is off-platform
 * (`supplierTenantId` is null) only the buyer party exists, and the buyer
 * advances the supplier-side stages on their behalf.
 *
 * No money moves through this table — it tracks the request/fulfilment
 * lifecycle only. The goods-receipt -> inventory inflow integration is a
 * separate later phase; `received` merely advances status for now.
 */
export interface NetworkOrderStatusEntry {
  status: string;
  at: string;
  byTenantId: string;
  note?: string;
}

@Entity('network_orders')
@Index(['buyerTenantId'])
@Index(['supplierTenantId'])
export class NetworkOrder extends BaseEntity {
  /** Human-readable order number, unique per row: PO-<year>-<4digit>. */
  @Column({ unique: true })
  orderNumber: string;

  @Column({ type: 'uuid' })
  buyerTenantId: string;

  @Column()
  buyerName: string;

  /** null = off-platform supplier (buyer advances supplier stages). */
  @Column({ type: 'uuid', nullable: true })
  supplierTenantId: string | null;

  @Column()
  supplierName: string;

  /** The buyer's local Supplier row id (in the buyer's tenant schema). */
  @Column({ type: 'uuid', nullable: true })
  supplierId: string | null;

  /** draft | requested | accepted | rejected | shipped | received | cancelled */
  @Column({ default: 'requested' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'date', nullable: true })
  expectedDate: string | null;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  /** Append-only audit trail of every status transition. */
  @Column({ type: 'jsonb', default: [] })
  statusHistory: NetworkOrderStatusEntry[];

  @Column({ type: 'varchar', nullable: true })
  createdByEmail: string | null;

  /** 'unpaid' | 'paid' — settlement state of this order. */
  @Column({ default: 'unpaid' })
  paymentStatus: string;

  /** How it was paid: 'wallet' (internal transfer) | 'external' (mark-as-paid). */
  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  /**
   * When the supplier accepts, a DRAFT sales invoice is auto-created in the
   * supplier's tenant (to the buyer-as-customer) — this is its id, linking the
   * cross-tenant order to the supplier's Sales/AR.
   */
  @Column({ type: 'uuid', nullable: true })
  salesInvoiceId: string | null;

  /**
   * PURCHASE bridge (buyer side): when the buyer marks this PO received it
   * materializes into a private `inventory_inflows` row (stock/FIFO/AP). This
   * is that inflow's id — set once, guards idempotency (no double stock-post).
   */
  @Column({ type: 'uuid', nullable: true })
  receivedInflowId: string | null;

  /**
   * SALES bridge (supplier side): when this incoming order concludes
   * (delivered/paid) it materializes into a private `orders` (sales) row. This
   * is that sales order's id — set once, guards idempotency (no double sale).
   */
  @Column({ type: 'uuid', nullable: true })
  salesOrderId: string | null;

  /** How the goods are delivered: 'shipment' | 'pickup' | 'dispatch'. Set when
   * the supplier marks the order in transit. */
  @Column({ type: 'varchar', nullable: true })
  deliveryMethod: string | null;

  /** Method-specific details, e.g. { shipmentCompany, trackingNumber } for
   * shipment, { riderName, riderPhone } for dispatch, { contact } for pickup. */
  @Column({ type: 'jsonb', nullable: true })
  deliveryInfo: Record<string, string> | null;
}
