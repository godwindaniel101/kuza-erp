import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from './base.entity';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('user_invitations')
export class Invitation extends TenantEntity {
  @Column()
  email: string;

  @Column({ unique: true, length: 64 })
  token: string;

  @Column({ nullable: true })
  roleId: string;

  @Column()
  invitedById: string;

  @Column({ default: 'user' })
  type: string; // 'user' for RMS, 'employee' for HRMS

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  inviter: User;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roleId' })
  role: Role;
}

