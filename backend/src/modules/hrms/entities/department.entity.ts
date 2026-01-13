import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Position } from './position.entity';
import { Employee } from './employee.entity';

@Entity('departments')
export class Department extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @Column({ type: 'uuid', nullable: true })
  managerId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => Department, (dept) => dept.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Department;

  @OneToMany(() => Department, (dept) => dept.parent)
  children: Department[];

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  @OneToMany(() => Position, (position) => position.department)
  positions: Position[];
}

