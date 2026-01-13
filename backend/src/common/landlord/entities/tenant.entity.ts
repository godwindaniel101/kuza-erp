import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../entities/base.entity';
import { LandlordUser } from './landlord-user.entity';

/**
 * Tenant entity stored in the landlord database
 * Each tenant represents a separate business/restaurant
 */
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  schemaName: string; // PostgreSQL schema name for this tenant

  @Column({ nullable: true })
  databaseName: string; // Database name if using separate databases instead of schemas

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  secondaryColor: string;

  @Column({ nullable: true, default: 'NGN' })
  currency: string;

  @Column({ nullable: true, default: 'en' })
  language: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // For subscription management

  @OneToMany(() => LandlordUser, (user) => user.tenant)
  users: LandlordUser[];
}
