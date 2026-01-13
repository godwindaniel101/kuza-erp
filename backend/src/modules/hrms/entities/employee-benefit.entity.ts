import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { BenefitPlan } from './benefit-plan.entity';

@Entity('employee_benefits')
export class EmployeeBenefit extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column({ type: 'date' })
  enrollmentDate: Date;

  @Column({ type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  coverageAmount: number;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => BenefitPlan, (plan) => plan.employeeBenefits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: BenefitPlan;
}

