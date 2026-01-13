import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { User } from '../../../common/entities/user.entity';

@Entity('time_entries')
@Index(['employeeId', 'entryDate'], { unique: true })
export class TimeEntry extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'date' })
  entryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  clockIn: Date;

  @Column({ type: 'timestamp', nullable: true })
  clockOut: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overtimeHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  regularHours: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ default: 'web' })
  entryType: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver: User;
}

