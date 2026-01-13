import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

@Entity('tax_configurations')
export class TaxConfiguration extends TenantEntity {
  @Column()
  country: string;

  @Column()
  taxType: string; // federal, state, local, social_security, medicare

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  minIncome: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  maxIncome: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  taxRate: number; // Percentage

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedAmount: number; // Fixed tax amount if applicable

  @Column({ type: 'date' })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional tax rules
}

