import { Entity, Column, ManyToOne, OneToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Restaurant } from './restaurant.entity';
import { Employee } from '../../modules/hrms/entities/employee.entity';
import { Role } from './role.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'uuid', nullable: true })
  businessId: string;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerified: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.users, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;

  @OneToOne(() => Employee, (employee) => employee.user, { nullable: true })
  employee: Employee;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];
}

