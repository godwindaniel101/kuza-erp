import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { SalaryStructure } from './salary-structure.entity';

@Entity('employee_salaries')
export class EmployeeSalary extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'uuid', nullable: true })
  structureId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseSalary: number;

  @Column({ type: 'jsonb', nullable: true })
  allowances: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  deductions: Record<string, number>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grossSalary: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  netSalary: number;

  @Column({ type: 'date' })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => SalaryStructure, (structure) => structure.employeeSalaries, { nullable: true })
  @JoinColumn({ name: 'structureId' })
  structure: SalaryStructure;
}

