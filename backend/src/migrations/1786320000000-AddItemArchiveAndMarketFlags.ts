import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds soft-archive + public-marketplace opt-in flags to `inventory_items`.
 *
 * Applied to `public` (the tenant template) AND every existing tenant schema by
 * `dist/scripts/run-migrations.js` — the runner sets `search_path` per schema,
 * so table names stay UNQUALIFIED here. Idempotent + non-destructive:
 * `ADD COLUMN IF NOT EXISTS` with safe defaults, so existing rows/data are
 * untouched and re-running is a no-op.
 *
 * MUST be applied to all tenant schemas BEFORE the code that reads these columns
 * is served (the entity now selects them). See DEPLOY notes in the PR.
 */
export class AddItemArchiveAndMarketFlags1786320000000
  implements MigrationInterface
{
  name = "AddItemArchiveAndMarketFlags1786320000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "is_archived" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "listed_on_market" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "listed_on_market"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "archived_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "is_archived"`,
    );
  }
}
