import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ReservationSource = 'staff' | 'online';

/**
 * A table booking. Tenant-scoped (lives in each tenant schema). Free-form time
 * (validated lightly); an optional table label can be assigned at confirmation.
 */
@Entity('reservations')
@Index(['reservationAt'])
@Index(['status'])
export class Reservation extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ type: 'int', default: 2 })
  partySize: number;

  /** Full booking datetime (date + time combined). */
  @Column({ type: 'timestamptz' })
  reservationAt: Date;

  @Column({ type: 'int', default: 90 })
  durationMins: number;

  @Column({ default: 'pending' })
  status: ReservationStatus;

  /** Assigned at confirmation (free text, e.g. "T4" / "Window 2"). */
  @Column({ nullable: true })
  tableLabel: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'staff' })
  source: ReservationSource;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ nullable: true })
  createdByName: string;
}
