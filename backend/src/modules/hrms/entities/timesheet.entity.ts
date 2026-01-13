import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { User } from '../../../common/entities/user.entity';

@Entity('timesheets')
@Index(['employeeId', 'weekStartDate'], { unique: true })
export class Timesheet extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'date' })
  weekStartDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  regularHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  @Column({ default: 'pending' })
  status: string;

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

