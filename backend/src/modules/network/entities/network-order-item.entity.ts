import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Line item on a Kuza Network purchase order — LANDLORD-scoped (lives in the
 * landlord database alongside NetworkOrder; registered on the 'landlord'
 * connection in landlord.module.ts). One row per requested line; both the
 * buyer and supplier tenants read it.
 */
@Entity('network_order_items')
@Index(['orderId'])
export class NetworkOrderItem extends BaseEntity {
  @Column({ type: 'uuid' })
  orderId: string;

  /**
   * The supplier's inventory item this line maps to (from the catalog listing).
   * Enables fulfilment/stock debit on accept and materializing a real sale.
   */
  @Column({ type: 'uuid', nullable: true })
  sourceInventoryItemId: string | null;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  unitPrice: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  lineTotal: number;
}
