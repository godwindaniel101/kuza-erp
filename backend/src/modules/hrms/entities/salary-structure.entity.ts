import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { EmployeeSalary } from './employee-salary.entity';

@Entity('salary_structures')
export class SalaryStructure extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseSalary: number;

  @Column({ type: 'jsonb', nullable: true })
  allowances: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  deductions: Record<string, number>;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => EmployeeSalary, (salary) => salary.structure)
  employeeSalaries: EmployeeSalary[];
}

