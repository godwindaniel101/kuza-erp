import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { TenantEntity } from "../../../common/entities/base.entity";
import { Branch } from "../../../common/entities/branch.entity";
import { InventoryAdjustmentItem } from "./inventory-adjustment-item.entity";

export enum AdjustmentReason {
  DAMAGE = "DAMAGE",
  THEFT = "THEFT",
  COUNT = "COUNT",
  EXPIRY = "EXPIRY",
  OTHER = "OTHER",
}

export enum AdjustmentStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/**
 * Inventory adjustment header (roadmap I5): reason-coded, approval-gated
 * stock corrections. Stock only changes when a DRAFT adjustment is approved;
 * approval applies the change transactionally with row locking and records
 * ADJUSTMENT / WRITE_OFF movements in the stock ledger.
 */
@Entity("inventory_adjustments")
export class InventoryAdjustment extends TenantEntity {
  @Column({ unique: true })
  adjustmentNumber: string;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @Column({ type: "varchar", length: 20 })
  reason: AdjustmentReason;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Index()
  @Column({ type: "varchar", length: 20, default: AdjustmentStatus.DRAFT })
  status: AdjustmentStatus;

  @Column({ type: "uuid", nullable: true })
  createdById: string | null;

  @Column({ type: "uuid", nullable: true })
  approvedById: string | null;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @OneToMany(() => InventoryAdjustmentItem, (item) => item.adjustment, {
    cascade: true,
  })
  items: InventoryAdjustmentItem[];
}
