import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';
import { Employee } from './employee.entity';

@Entity('positions')
export class Position extends TenantEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @Column({ type: 'uuid', nullable: true })
  salaryBandId: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Department, (dept) => dept.positions, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @OneToMany(() => Employee, (employee) => employee.position)
  employees: Employee[];
}

