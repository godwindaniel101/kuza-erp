import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { TenantEntity } from "../../../common/entities/base.entity";
import { InventoryAdjustment } from "./inventory-adjustment.entity";
import { InventoryItem } from "./inventory-item.entity";

/** One line of an inventory adjustment. `quantityChange` is signed (base UOM). */
@Entity("inventory_adjustment_items")
export class InventoryAdjustmentItem extends TenantEntity {
  @Index()
  @Column({ type: "uuid" })
  adjustmentId: string;

  @Column({ type: "uuid" })
  itemId: string;

  /** Signed change in base UOM: positive = stock in, negative = stock out. */
  @Column({ type: "decimal", precision: 14, scale: 2 })
  quantityChange: number;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  unitCost: number | null;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @ManyToOne(() => InventoryAdjustment, (adjustment) => adjustment.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "adjustmentId" })
  adjustment: InventoryAdjustment;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "itemId" })
  item: InventoryItem;
}
