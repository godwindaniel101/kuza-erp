import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../../common/entities/restaurant.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { Order } from './order.entity';

@Entity('tables')
export class Table extends TenantEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @Column()
  name: string;

  @Column()
  capacity: number;

  @Column({ default: 'available' })
  status: string;

  @Column({ nullable: true })
  qrCode: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @OneToMany(() => Order, (order) => order.table)
  orders: Order[];
}

