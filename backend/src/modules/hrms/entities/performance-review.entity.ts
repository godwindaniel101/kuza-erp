import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { PerformanceGoal } from './performance-goal.entity';
import { PerformanceRating } from './performance-rating.entity';

@Entity('performance_reviews')
export class PerformanceReview extends TenantEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column()
  reviewPeriod: string;

  @Column({ type: 'date' })
  reviewDate: Date;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallRating: number;

  @Column({ type: 'text', nullable: true })
  strengths: string;

  @Column({ type: 'text', nullable: true })
  areasForImprovement: string;

  @Column({ type: 'text', nullable: true })
  employeeComments: string;

  @Column({ type: 'text', nullable: true })
  managerComments: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'uuid' })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @OneToMany(() => PerformanceGoal, (goal) => goal.review, { cascade: true })
  goals: PerformanceGoal[];

  @OneToMany(() => PerformanceRating, (rating) => rating.review, { cascade: true })
  ratings: PerformanceRating[];
}

