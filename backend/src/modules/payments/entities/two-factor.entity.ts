import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/** A user's TOTP (Google Authenticator) secret, used to gate sensitive actions. */
@Entity('two_factor')
@Index(['userId'], { unique: true })
export class TwoFactor extends TenantEntity {
  @Column({ type: 'uuid' })
  userId: string;

  /** base32 TOTP secret. Stays server-side; only shown once during enrollment. */
  @Column()
  secret: string;

  /** True once the user has confirmed a code (enrollment complete). */
  @Column({ default: false })
  enabled: boolean;
}
