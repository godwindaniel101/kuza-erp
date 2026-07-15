import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { TenantEntity } from "../../../common/entities/base.entity";
import { InventoryItem } from "./inventory-item.entity";

export enum StockMovementType {
  INFLOW = "INFLOW",
  SALE = "SALE",
  TRANSFER_OUT = "TRANSFER_OUT",
  TRANSFER_IN = "TRANSFER_IN",
  ADJUSTMENT = "ADJUSTMENT",
  WRITE_OFF = "WRITE_OFF",
  RETURN = "RETURN",
}

/**
 * Immutable, append-only stock ledger (roadmap I1, audit C-INV-1).
 *
 * Every stock mutation (inflow, sale, transfer, adjustment, write-off,
 * return) writes exactly one row here, inside the same DB transaction as the
 * mutation itself. Rows are NEVER updated or deleted — no service or
 * controller exposes an update/delete path. `quantity` is signed in the
 * item's base UOM: positive = stock in, negative = stock out.
 */
@Entity("stock_movements")
export class StockMovement extends TenantEntity {
  @Index()
  @Column({ type: "uuid" })
  itemId: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @Column({ type: "uuid", nullable: true })
  batchId: string | null;

  @Index()
  @Column({ type: "varchar", length: 20 })
  movementType: StockMovementType;

  /** Signed quantity in base UOM. Positive = in, negative = out. */
  @Column({ type: "decimal", precision: 14, scale: 2 })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  unitCost: number | null;

  /** Origin of the movement, e.g. 'inflow' | 'order' | 'transfer' | 'adjustment'. */
  @Column()
  sourceType: string;

  /** Id of the originating document (inflow id, order id, transfer id, adjustment id). */
  @Column({ type: "uuid" })
  sourceId: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ type: "uuid", nullable: true })
  performedById: string | null;

  /** Item-level currentStock immediately after this movement was applied. */
  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  balanceAfter: number | null;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "itemId" })
  item: InventoryItem;
}
