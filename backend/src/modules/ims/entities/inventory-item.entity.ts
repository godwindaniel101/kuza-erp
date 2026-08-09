import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
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

  /**
   * Whether this item is offered for sale at the POS / on the menu. Ingredients
   * (make-up components not sold directly) set this false; they still appear in
   * the make-up picker and are tracked in inventory.
   */
  @Column({ default: true })
  sellAtPos: boolean;

  /**
   * Soft-archive: archived items are hidden from the active items list but keep
   * all history (batches, movements, orders). Replaces hard delete. Restorable.
   */
  @Column({ default: false })
  isArchived: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /**
   * Explicit opt-in to the PUBLIC cross-tenant marketplace (/shop). Only items
   * with this true (and stock>0, sale_price>0, sell_at_pos, published store) are
   * surfaced by PublicMarketService. Set via the "List on market" action.
   */
  @Column({ default: false })
  listedOnMarket: boolean;

  /**
   * Default physical row/rack ("bin") location for this item, e.g. 'A-03-2'
   * (Warehouse MS v1). Per-branch overrides live on BranchInventoryItem.
   */
  @Column({ nullable: true })
  binLocation: string;

  @Column({ nullable: true })
  frontImage: string;

  @Column({ type: 'jsonb', nullable: true })
  additionalImages: string[];

  // Audit: who created / last updated this item (name denormalized for display).
  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  createdByName: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  updatedByName: string;

  // In multi-tenant database setup, business relation is not needed
  // Each database belongs to a specific tenant/business

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

