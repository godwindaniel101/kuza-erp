import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Branch } from './branch.entity';

@Entity('restaurants')
export class Restaurant extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  secondaryColor: string;

  @Column({ nullable: true, default: 'NGN' })
  currency: string;

  @Column({ nullable: true, default: 'en' })
  language: string;

  @OneToMany(() => User, (user) => user.restaurant)
  users: User[];

  @OneToMany(() => Branch, (branch) => branch.restaurant)
  branches: Branch[];
}

