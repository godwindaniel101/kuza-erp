import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

@Entity('locations')
export class Location extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Employee, (employee) => employee.location)
  employees: Employee[];
}

