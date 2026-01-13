import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../../common/entities/restaurant.entity';
import { Uom } from './uom.entity';
import { BranchInventoryItem } from './branch-inventory-item.entity';
import { InventoryBatch } from './inventory-batch.entity';
import { InventoryCategory } from './inventory-category.entity';
import { InventorySubcategory } from './inventory-subcategory.entity';

@Entity('inventory_items')
export class InventoryItem extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'uuid', nullable: true })
  subcategoryId: string;

  @Column({ type: 'uuid' })
  baseUomId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salePrice: number;

  @Column({ nullable: true, unique: true })
  barcode: string;

  @Column({ default: true })
  isTrackable: boolean;

  @Column({ nullable: true })
  frontImage: string;

  @Column({ type: 'jsonb', nullable: true })
  additionalImages: string[];

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;

  @ManyToOne(() => Uom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'baseUomId' })
  baseUom: Uom;

  @ManyToOne(() => InventoryCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: InventoryCategory;

  @ManyToOne(() => InventorySubcategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subcategoryId' })
  subcategory: InventorySubcategory;

  @OneToMany(() => BranchInventoryItem, (item) => item.inventoryItem, { cascade: true })
  branches: BranchInventoryItem[];

  @OneToMany(() => InventoryBatch, (batch) => batch.inventoryItem, { cascade: true })
  batches: InventoryBatch[];
}

