import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { EmployeeBenefit } from './employee-benefit.entity';

@Entity('benefit_plans')
export class BenefitPlan extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  employerContribution: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  employeeContribution: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date;

  @OneToMany(() => EmployeeBenefit, (benefit) => benefit.plan)
  employeeBenefits: EmployeeBenefit[];
}

