/**
 * Backfill: reconcile branch stock counters with sellable FIFO inflow batches.
 *
 * WHY: A sale allocates from `inventory_inflow_items` scoped to the selling
 * branch, but historically stock transfers only bumped the
 * `branch_inventory_items.current_stock` counter without creating matching
 * inflow batches at the destination. Result: the POS shows stock the sale
 * engine cannot allocate ("Available: 2" while the card says 49). The transfer
 * flow is now fixed going forward; this script repairs EXISTING divergence.
 *
 * WHAT: For every (branch, item) where `current_stock` exceeds the allocatable
 * inflow quantity, it creates one reconciliation inflow batch at that branch for
 * the shortfall, valued at the item's `unit_cost`, so the transferred/opening
 * stock becomes sellable. It NEVER reduces existing batches or counters.
 *
 * SAFETY: Dry-run by default — it only prints the plan. It writes ONLY when run
 * with `APPLY=true`. Multi-tenant: iterates every active tenant schema. Run it
 * against LOCAL first and review the plan before applying anywhere else.
 *
 *   Dry run:  npx ts-node -r tsconfig-paths/register src/scripts/backfill-transfer-inflow-batches.ts
 *   Apply:    APPLY=true npx ts-node -r tsconfig-paths/register src/scripts/backfill-transfer-inflow-batches.ts
 */
import { randomUUID } from "crypto";
import { AppDataSource } from "../config/data-source";

const APPLY = process.env.APPLY === "true";

// Divergence per (branch, item): counter vs sellable inflow batches.
const RECONCILE_SQL = `
  WITH sold AS (
    SELECT inflow_item_id, SUM(quantity_used) AS qty
    FROM order_item_inflow_items
    GROUP BY inflow_item_id
  ),
  alloc AS (
    SELECT ii.branch_id, ii.inventory_item_id,
           SUM(GREATEST(ii.base_quantity - COALESCE(s.qty, 0), 0)) AS allocatable
    FROM inventory_inflow_items ii
    LEFT JOIN sold s ON s.inflow_item_id = ii.id
    GROUP BY ii.branch_id, ii.inventory_item_id
  )
  SELECT bi.branch_id,
         bi.inventory_item_id,
         bi.current_stock::float8                     AS current_stock,
         COALESCE(a.allocatable, 0)::float8           AS allocatable,
         (bi.current_stock - COALESCE(a.allocatable, 0))::float8 AS shortfall,
         COALESCE(item.unit_cost, 0)::float8          AS unit_cost,
         item.base_uom_id                             AS base_uom_id,
         item.name                                    AS item_name
  FROM branch_inventory_items bi
  JOIN inventory_items item ON item.id = bi.inventory_item_id
  LEFT JOIN alloc a
    ON a.branch_id = bi.branch_id
   AND a.inventory_item_id = bi.inventory_item_id
  WHERE bi.current_stock > COALESCE(a.allocatable, 0) + 0.0001
  ORDER BY shortfall DESC
`;

async function processSchema(schemaName: string): Promise<{
  created: number;
  units: number;
}> {
  await AppDataSource.query(`SET search_path TO "${schemaName}", public`);
  const rows: any[] = await AppDataSource.query(RECONCILE_SQL);

  if (rows.length === 0) {
    console.log(`  ✓ ${schemaName}: already reconciled (no divergence)`);
    return { created: 0, units: 0 };
  }

  console.log(`  • ${schemaName}: ${rows.length} (branch,item) need batches`);
  let created = 0;
  let units = 0;

  for (const r of rows) {
    const shortfall = Number(r.shortfall);
    if (!(shortfall > 0)) continue;
    const unitCost = Number(r.unit_cost) || 0;
    const totalCost = Math.round(unitCost * shortfall * 100) / 100;
    console.log(
      `      - ${r.item_name}: counter=${r.current_stock} allocatable=${r.allocatable} → +${shortfall} @ ${unitCost}/u`,
    );

    if (!APPLY) {
      created += 1;
      units += shortfall;
      continue;
    }

    const inflowId = randomUUID();
    await AppDataSource.query(
      `INSERT INTO inventory_inflows
         (id, branch_id, received_date, total_amount, status, type, created_at, updated_at)
       VALUES ($1, $2, NOW()::date, $3, 'received', 'transfer_backfill', NOW(), NOW())`,
      [inflowId, r.branch_id, totalCost],
    );
    await AppDataSource.query(
      `INSERT INTO inventory_inflow_items
         (id, inflow_id, inventory_item_id, uom_id, quantity, base_quantity, unit_cost, total_cost, branch_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, NOW(), NOW())`,
      [
        randomUUID(),
        inflowId,
        r.inventory_item_id,
        r.base_uom_id,
        shortfall,
        unitCost,
        totalCost,
        r.branch_id,
      ],
    );
    created += 1;
    units += shortfall;
  }

  return { created, units };
}

async function main() {
  console.log(
    `\n=== Transfer inflow-batch backfill (${APPLY ? "APPLY — WRITING" : "DRY RUN — no writes"}) ===\n`,
  );
  await AppDataSource.initialize();
  try {
    const tenants: any[] = await AppDataSource.query(
      `SELECT schema_name FROM public.tenants WHERE is_active = true AND schema_name IS NOT NULL`,
    );
    console.log(`Found ${tenants.length} active tenant schema(s).\n`);

    let totalCreated = 0;
    let totalUnits = 0;
    for (const t of tenants) {
      const res = await processSchema(t.schema_name);
      totalCreated += res.created;
      totalUnits += res.units;
    }
    await AppDataSource.query(`SET search_path TO public`);

    console.log(
      `\n=== ${APPLY ? "Created" : "Would create"} ${totalCreated} reconciliation batch(es), ${Math.round(totalUnits * 100) / 100} units total ===`,
    );
    if (!APPLY) {
      console.log("Re-run with APPLY=true to write these batches.\n");
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
