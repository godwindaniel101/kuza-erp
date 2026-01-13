import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

@Entity('employee_tax_info')
export class EmployeeTaxInfo extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  taxId: string; // SSN, TIN, etc.

  @Column({ nullable: true })
  filingStatus: string; // single, married, married_joint, head_of_household

  @Column({ type: 'int', nullable: true, default: 0 })
  allowances: number; // W-4 equivalent

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  additionalWithholding: number; // Additional amount to withhold

  @Column({ type: 'boolean', default: false })
  exemptFromFederal: boolean;

  @Column({ type: 'boolean', default: false })
  exemptFromState: boolean;

  @Column({ type: 'boolean', default: false })
  exemptFromLocal: boolean;

  @Column({ type: 'jsonb', nullable: true })
  stateTaxInfo: Record<string, any>; // State-specific tax information

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>; // Additional tax-related fields

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;
}

