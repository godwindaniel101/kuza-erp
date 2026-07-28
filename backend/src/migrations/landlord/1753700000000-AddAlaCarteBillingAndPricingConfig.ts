import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Landlord-scoped migration for the à-la-carte pricing model.
 *
 * 1. `pricing_configs` — the super-admin-editable pricing catalog (one global
 *    row; seeded lazily from code defaults by BillingService).
 * 2. `tenant_subscriptions` — the à-la-carte selection a tenant pays for
 *    (apps + branch/user allowance + computed amount/currency).
 * 3. `subscription_payments` — a `selection` payload for à-la-carte checkouts,
 *    and `plan_id`/`plan_code` made nullable (à-la-carte payments carry no plan).
 *
 * Landlord (public) database only — no tenant-schema change. Dev runs with
 * synchronize:true so these apply automatically; this migration is the
 * production path (synchronize disabled). All statements are idempotent.
 */
export class AddAlaCarteBillingAndPricingConfig1753700000000
  implements MigrationInterface
{
  name = 'AddAlaCarteBillingAndPricingConfig1753700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. pricing_configs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricing_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "key" character varying NOT NULL DEFAULT 'global',
        "app_prices" jsonb NOT NULL,
        "usage_prices" jsonb NOT NULL,
        "included_branches" integer NOT NULL DEFAULT 1,
        "included_users" integer NOT NULL DEFAULT 3,
        CONSTRAINT "PK_pricing_configs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pricing_configs_key" ON "pricing_configs" ("key")`,
    );

    // 2. tenant_subscriptions — à-la-carte selection
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "selected_apps" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "branches" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "users" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "amount_major" numeric(14,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "currency" character varying`,
    );

    // 3. subscription_payments — selection payload + nullable plan columns
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "selection" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ALTER COLUMN "plan_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ALTER COLUMN "plan_code" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-tighten plan columns (best-effort; fails if à-la-carte rows exist).
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ALTER COLUMN "plan_code" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ALTER COLUMN "plan_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" DROP COLUMN IF EXISTS "selection"`,
    );

    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "amount_major"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "users"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "branches"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "selected_apps"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_pricing_configs_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_configs"`);
  }
}
