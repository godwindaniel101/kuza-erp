import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { Course } from './course.entity';

@Entity('enrollments')
export class Enrollment extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'timestamp' })
  enrolledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: 'enrolled' })
  status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  progress: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ nullable: true })
  certificate: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Course, (course) => course.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;
}

