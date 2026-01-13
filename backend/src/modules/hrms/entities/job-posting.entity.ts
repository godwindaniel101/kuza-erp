import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';
import { JobApplication } from './job-application.entity';

@Entity('job_postings')
export class JobPosting extends TenantEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @Column({ type: 'uuid', nullable: true })
  positionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salaryMin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salaryMax: number;

  @Column({ type: 'date' })
  postedDate: Date;

  @Column({ type: 'date', nullable: true })
  closingDate: Date;

  @Column({ default: 'open' })
  status: string;

  @Column({ default: 1 })
  openings: number;

  @Column({ default: 0 })
  applicationsCount: number;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @OneToMany(() => JobApplication, (application) => application.jobPosting)
  applications: JobApplication[];
}

