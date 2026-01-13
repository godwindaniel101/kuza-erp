import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { LeaveRequest } from './leave-request.entity';
import { LeaveBalance } from './leave-balance.entity';

@Entity('leave_types')
export class LeaveType extends TenantEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  maxDaysPerYear: number;

  @Column({ default: false })
  accrues: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  accrualRate: number;

  @Column()
  accrualFrequency: string;

  @Column({ default: false })
  carryOverAllowed: boolean;

  @Column({ nullable: true })
  maxCarryOverDays: number;

  @Column({ default: true })
  requiresApproval: boolean;

  @Column({ default: false })
  requiresDocument: boolean;

  @Column({ default: false })
  halfDayAllowed: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => LeaveRequest, (request) => request.leaveType)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => LeaveBalance, (balance) => balance.leaveType)
  leaveBalances: LeaveBalance[];
}

