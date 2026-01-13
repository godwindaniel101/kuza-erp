import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Uom } from './uom.entity';

@Entity('uom_conversions')
export class UomConversion extends TenantEntity {
  @Column({ type: 'uuid' })
  fromUomId: string;

  @Column({ type: 'uuid' })
  toUomId: string;

  @Column({ type: 'decimal', precision: 20, scale: 6 })
  factor: number;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date;

  @ManyToOne(() => Uom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromUomId' })
  fromUom: Uom;

  @ManyToOne(() => Uom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toUomId' })
  toUom: Uom;
}

