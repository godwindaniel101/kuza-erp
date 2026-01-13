import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { PayrollItem } from './payroll-item.entity';

@Entity('payrolls')
export class Payroll extends TenantEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column()
  payPeriod: string;

  @Column({ type: 'date' })
  payPeriodStart: Date;

  @Column({ type: 'date' })
  payPeriodEnd: Date;

  @Column({ type: 'date' })
  payDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  grossPay: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDeductions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netPay: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  federalTax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stateTax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  localTax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  socialSecurityTax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  medicareTax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalTax: number;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  paymentStatus: string; // pending, processed, failed

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  paymentReference: string; // Bank transaction reference

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @OneToMany(() => PayrollItem, (item) => item.payroll, { cascade: true })
  items: PayrollItem[];
}

