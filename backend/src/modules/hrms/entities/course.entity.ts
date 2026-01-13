import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Enrollment } from './enrollment.entity';

@Entity('courses')
export class Course extends TenantEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  instructor: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  duration: number;

  @Column({ nullable: true })
  durationUnit: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  certificateTemplate: string;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];
}

