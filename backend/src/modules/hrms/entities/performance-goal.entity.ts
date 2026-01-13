import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PerformanceReview } from './performance-review.entity';

@Entity('performance_goals')
export class PerformanceGoal extends BaseEntity {
  @Column({ type: 'uuid' })
  reviewId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  targetValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  actualValue: number;

  @Column({ default: 'pending' })
  status: string;

  @ManyToOne(() => PerformanceReview, (review) => review.goals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: PerformanceReview;
}

