import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PerformanceReview } from './performance-review.entity';

@Entity('performance_ratings')
export class PerformanceRating extends BaseEntity {
  @Column({ type: 'uuid' })
  reviewId: string;

  @Column()
  criteria: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @ManyToOne(() => PerformanceReview, (review) => review.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: PerformanceReview;
}

