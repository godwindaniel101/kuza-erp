import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Branch } from './branch.entity';

@Entity('businesses')
export class Business extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

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

  /** ISO-3166 alpha-2 country code chosen at registration; drives currency. */
  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true, default: 'en' })
  language: string;

  /**
   * Product edition chosen at registration (canonical values:
   * 'hospitality' | 'accounts' | 'retail' | 'hr' | 'warehouse').
   * Legacy tenants may still hold 'restaurant' | 'services' | 'general';
   * reads normalize via normalizeBusinessType (app-registry).
   */
  @Column({ nullable: true, default: 'general' })
  businessType: string;

  /**
   * Inventory outflow allocation policy for this tenant:
   * FIFO (first-in-first-out), LIFO (last-in-first-out),
   * or FEFO (first-expiry-first-out). Consumed by order allocation.
   */
  @Column({ nullable: true, default: 'FIFO' })
  allocationMethod: string;

  /**
   * Canonical app keys enabled for this business (see
   * common/apps/app-registry.ts). NULL = legacy tenant that predates the
   * apps model — treated at read time as "everything the plan allows", so
   * existing tenants are unaffected until they first touch the Apps API.
   */
  @Column({ type: 'jsonb', nullable: true })
  enabledApps: string[] | null;

  @OneToMany(() => User, (user) => user.business)
  users: User[];

  @OneToMany(() => Branch, (branch) => branch.business)
  branches: Branch[];
}

