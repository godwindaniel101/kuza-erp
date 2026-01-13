import { Entity, Column, ManyToOne, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { User } from '../../../common/entities/user.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';
import { Location } from './location.entity';

@Entity('employees')
export class Employee extends TenantEntity {
  @Column({ nullable: true, unique: true })
  userId: string;

  @Column({ unique: true })
  employeeNumber: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  preferredName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  personalEmail: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'timestamp' })
  hireDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  originalHireDate: Date;

  @Column({ default: 'active' })
  employmentStatus: string;

  @Column({ default: 'full_time' })
  employmentType: string;

  @Column({ type: 'timestamp', nullable: true })
  terminationDate: Date;

  @Column({ type: 'text', nullable: true })
  terminationReason: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @Column({ type: 'uuid', nullable: true })
  positionId: string;

  @Column({ type: 'uuid', nullable: true })
  locationId: string;

  @Column({ type: 'uuid', nullable: true })
  managerId: string;

  @Column({ nullable: true })
  profilePhotoPath: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  // Bank Account Information for Payroll
  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankRoutingNumber: string;

  @Column({ nullable: true })
  bankAccountType: string; // checking, savings

  @Column({ nullable: true })
  bankAccountHolderName: string;

  @Column({ nullable: true })
  bankSwiftCode: string; // For international transfers

  @Column({ nullable: true })
  bankIban: string; // For international accounts

  @Column({ nullable: true })
  paymentMethod: string; // bank_transfer, check, cash

  @OneToOne(() => User, (user) => user.employee, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @ManyToOne(() => Employee, (employee) => employee.directReports, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager: Employee;

  @OneToMany(() => Employee, (employee) => employee.manager)
  directReports: Employee[];
}

