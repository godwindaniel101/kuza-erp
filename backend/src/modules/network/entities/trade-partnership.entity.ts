import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Kuza Network trade partnership — LANDLORD-scoped (lives in the landlord
 * database, shared across all tenants; registered on the 'landlord'
 * connection in landlord.module.ts).
 *
 * A directed buyer -> supplier relationship between two tenants. The buyer (or
 * an invited supplier) requests it; the supplier accepts/rejects. On accept
 * the buyer is materialized as a Customer inside the supplier's tenant schema.
 * The (buyer, supplier) pair is unique. Contacts/partnerships only — no money.
 */
@Entity('trade_partnerships')
@Index(['buyerTenantId', 'supplierTenantId'], { unique: true })
export class TradePartnership extends BaseEntity {
  @Column({ type: 'uuid' })
  buyerTenantId: string;

  @Column({ type: 'uuid' })
  supplierTenantId: string;

  /** pending | active | rejected | revoked */
  @Column({ default: 'pending' })
  status: string;

  /** buyer | supplier */
  @Column({ default: 'buyer' })
  initiatedBy: string;

  @Column({ type: 'varchar', nullable: true })
  requestedByEmail: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date | null;
}
