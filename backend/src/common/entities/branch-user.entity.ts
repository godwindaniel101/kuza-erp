import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantEntity } from './base.entity';
import { Branch } from './branch.entity';
import { User } from './user.entity';

/**
 * Assigns a tenant user to a branch. A user may be assigned to several branches
 * (multi-branch staff). `isManager` marks a branch manager — the actor who
 * approves incoming transfer requests and receives branch activity
 * notifications. Absence of any assignment for a user means "not branch-scoped"
 * (sees all branches) — see the branch-scope resolution on req.user.
 */
@Entity('branch_users')
@Index('uq_branch_users_branch_user', ['branchId', 'userId'], { unique: true })
export class BranchUser extends TenantEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid' })
  userId: string;

  /** A branch manager approves transfers into this branch and is notified of activity. */
  @Column({ type: 'boolean', default: false })
  isManager: boolean;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
