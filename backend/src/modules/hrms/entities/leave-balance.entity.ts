import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { LeaveType } from './leave-type.entity';

@Entity('leave_balances')
@Index(['employeeId', 'leaveTypeId', 'year'], { unique: true })
export class LeaveBalance extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'uuid' })
  leaveTypeId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accrued: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  used: number;

  @Column()
  year: number;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => LeaveType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: LeaveType;
}

