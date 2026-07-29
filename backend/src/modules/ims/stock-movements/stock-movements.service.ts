import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  StockMovement,
  StockMovementType,
} from "../entities/stock-movement.entity";
import { InventoryItem } from "../entities/inventory-item.entity";
import { QueryStockMovementsDto } from "./dto/query-stock-movements.dto";

export interface RecordStockMovementInput {
  itemId: string;
  branchId?: string | null;
  batchId?: string | null;
  movementType: StockMovementType;
  /** Signed quantity in base UOM. Positive = in, negative = out. */
  quantity: number;
  unitCost?: number | null;
  sourceType: string;
  sourceId: string;
  reason?: string | null;
  performedById?: string | null;
  balanceAfter?: number | null;
}

/**
 * Append-only stock ledger service (roadmap I1/I2).
 *
 * `record()` is called by every service that mutates stock (inflows, orders,
 * transfers, adjustments) and only uses the injected repository, so it always
 * participates in the caller's ambient transaction (typeorm-transactional /
 * TenantTransactionInterceptor). This service intentionally exposes NO update
 * or delete methods — the ledger is immutable.
 */
@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
  ) {}

  async record(input: RecordStockMovementInput): Promise<StockMovement> {
    const movement = this.movementRepository.create({
      itemId: input.itemId,
      branchId: input.branchId ?? null,
      batchId: input.batchId ?? null,
      movementType: input.movementType,
      quantity: Math.round(Number(input.quantity) * 100) / 100,
      unitCost: input.unitCost != null ? Number(input.unitCost) : null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      reason: input.reason ?? null,
      performedById: input.performedById ?? null,
      balanceAfter:
        input.balanceAfter != null
          ? Math.round(Number(input.balanceAfter) * 100) / 100
          : null,
    });
    return this.movementRepository.save(movement);
  }

  async findAll(
    query: QueryStockMovementsDto,
    allowedBranchIds?: string[] | null,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.movementRepository
      .createQueryBuilder("movement")
      .orderBy("movement.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (query.itemId) {
      qb.andWhere("movement.itemId = :itemId", { itemId: query.itemId });
    }
    // Requested branch ids from the multi-select filter (comma-separated).
    let filterBranchIds = query.branchId
      ? query.branchId
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    // Branch scoping: a scoped user is limited to their allowed branches. When
    // they also request specific branches, intersect the two; otherwise fall
    // back to the full allowed set. Unscoped users (null) keep the requested
    // list as-is (existing behavior).
    if (Array.isArray(allowedBranchIds)) {
      // Scoped user. Assigned to no branch → nothing at all.
      if (allowedBranchIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      filterBranchIds = filterBranchIds.length
        ? filterBranchIds.filter((b) => allowedBranchIds.includes(b))
        : [...allowedBranchIds];
      // A scoped user whose selection is entirely out of scope sees nothing.
      if (filterBranchIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
    }
    if (filterBranchIds.length > 0) {
      qb.andWhere("movement.branchId IN (:...filterBranchIds)", {
        filterBranchIds,
      });
    }
    if (query.type) {
      qb.andWhere("movement.movementType = :type", { type: query.type });
    }
    if (query.from) {
      qb.andWhere("movement.createdAt >= :from", {
        from: new Date(query.from),
      });
    }
    if (query.to) {
      qb.andWhere("movement.createdAt <= :to", { to: new Date(query.to) });
    }

    const [rows, total] = await qb.getManyAndCount();

    // Resolve item names via a direct batched query instead of a relation
    // join: relation joins have been observed resolving to the wrong schema
    // in this multi-tenant setup (see inflows/transfers findOne comments).
    const itemIds = [...new Set(rows.map((m) => m.itemId).filter(Boolean))];
    const inventoryItems = itemIds.length
      ? await this.inventoryItemRepository.find({
          where: { id: In(itemIds) },
        })
      : [];
    const nameById = new Map(inventoryItems.map((i) => [i.id, i.name]));

    // Resolve branch names the same way (direct lookup — relation joins are
    // unreliable under the tenant schema).
    const branchIds = [...new Set(rows.map((m) => m.branchId).filter(Boolean))];
    const branchRows = branchIds.length
      ? await this.movementRepository.manager.query(
          `SELECT id, name FROM branches WHERE id = ANY($1::uuid[])`,
          [branchIds],
        )
      : [];
    const branchNameById = new Map<string, string>(
      (branchRows || []).map((b: any) => [b.id, b.name]),
    );

    const items = rows.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemName: nameById.get(m.itemId) || null,
      branchId: m.branchId,
      branchName: m.branchId ? branchNameById.get(m.branchId) || null : null,
      batchId: m.batchId,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      unitCost: m.unitCost != null ? Number(m.unitCost) : null,
      sourceType: m.sourceType,
      sourceId: m.sourceId,
      reason: m.reason,
      performedById: m.performedById,
      balanceAfter: m.balanceAfter != null ? Number(m.balanceAfter) : null,
      createdAt: m.createdAt,
    }));

    return { items, total, page, limit };
  }

  /**
   * Reconciliation report (roadmap I2): compares the mutable
   * InventoryItem.currentStock column against the ledger balance
   * (SUM of signed movements) per item, flagging any drift.
   *
   * Note: stock that existed before the ledger was introduced shows up as
   * drift until an opening-balance adjustment is approved for it.
   */
  async getReconciliation() {
    const [inventoryItems, sums] = await Promise.all([
      this.inventoryItemRepository.find({ order: { name: "ASC" } }),
      this.movementRepository
        .createQueryBuilder("movement")
        .select("movement.itemId", "itemId")
        .addSelect("COALESCE(SUM(movement.quantity), 0)", "ledgerBalance")
        .groupBy("movement.itemId")
        .getRawMany<{ itemId: string; ledgerBalance: string }>(),
    ]);

    const ledgerByItem = new Map(
      sums.map((row) => [row.itemId, Number(row.ledgerBalance) || 0]),
    );

    const rows = inventoryItems.map((item) => {
      const currentStock = Number(item.currentStock) || 0;
      const ledgerBalance = ledgerByItem.get(item.id) || 0;
      const drift = Math.round((currentStock - ledgerBalance) * 100) / 100;
      return {
        itemId: item.id,
        itemName: item.name,
        currentStock,
        ledgerBalance,
        drift,
        hasDrift: drift !== 0,
      };
    });

    return {
      totalItems: rows.length,
      itemsWithDrift: rows.filter((r) => r.hasDrift).length,
      rows,
    };
  }
}
