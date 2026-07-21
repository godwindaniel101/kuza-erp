import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * The bank account a business's collected inflows settle to. One per tenant.
 * Changing it is a sensitive action — gated by TOTP 2FA in the service.
 */
@Entity('payment_settlement')
export class PaymentSettlement extends TenantEntity {
  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankCode: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  accountName: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  updatedByName: string;
}
