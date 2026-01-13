import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Payroll } from './payroll.entity';

@Entity('payroll_items')
export class PayrollItem extends BaseEntity {
  @Column({ type: 'uuid' })
  payrollId: string;

  @Column()
  type: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: true })
  isEarning: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Payroll, (payroll) => payroll.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payrollId' })
  payroll: Payroll;
}

