import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { JobPosting } from './job-posting.entity';

@Entity('job_applications')
export class JobApplication extends BaseEntity {
  @Column({ type: 'uuid' })
  jobPostingId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @Column({ nullable: true })
  resume: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => JobPosting, (posting) => posting.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostingId' })
  jobPosting: JobPosting;
}

