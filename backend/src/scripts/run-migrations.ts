/**
 * Deploy-time DB migration runner — schema-per-tenant aware, idempotent, safe.
 *
 * Runs ONLY pending migrations, in order, against:
 *   1. the landlord DB (erp_landlord)         → dist/migrations/landlord/*.js
 *   2. the tenant template (erp_db · public)  → dist/migrations/*.js
 *   3. every tenant schema in erp_db          → dist/migrations/*.js, per schema
 *
 * Why per-tenant is special: tenant schemas are cloned from `public`
 * (CREATE TABLE … LIKE) and carry NO migration history. So before running a
 * schema we RECORD the baseline as already-applied (it must never re-run its
 * CREATE TABLEs on tables that already exist); only post-baseline migrations
 * then apply. Fresh schemas (none in a clean prod DB) build from the baseline.
 *
 * Non-destructive: only CREATE … IF NOT EXISTS, INSERT, and TypeORM's own
 * runMigrations() (which is append-only). Never drops or truncates.
 *
 * Run inside the production image (dist-only, dev-deps pruned) with:
 *     node dist/scripts/run-migrations.js
 * It uses the DataSource API + compiled JS, so it needs no ts-node / CLI.
 *
 * Env: DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME LANDLORD_DB_NAME
 *      (falls back to DB_LANDLORD_NAME) DB_SSL. On Cloud SQL set
 *      DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE (node-pg treats a leading "/"
 *      as a Unix-socket dir — no SSL needed for the socket).
 *
 * NOTE: the landlord history has no baseline (base landlord tables are created
 * by `synchronize` in dev). A brand-new erp_landlord must have its base tables
 * created once before the landlord ALTER migrations can apply — see DEPLOY.md.
 */
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

// The single tenant baseline (src/migrations/1784976516507-BaselinePublicSchema.ts).
const BASELINE = { timestamp: 1784976516507, name: 'BaselinePublicSchema1784976516507' };
// A table the baseline creates — its presence marks an already-cloned/built schema.
const MARKER_TABLE = 'audit_logs';
const SCHEMA_RE = /^[A-Za-z0-9_]+$/; // interpolation guard (matches TenantGuard's rule)

const CONN = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: ['error', 'migration'] as ('error' | 'migration')[],
};
const TENANT_DB = process.env.DB_NAME || 'erp_db';
const LANDLORD_DB = process.env.LANDLORD_DB_NAME || process.env.DB_LANDLORD_NAME || 'erp_landlord';
const TENANT_MIGRATIONS = [__dirname + '/../migrations/*.js'];
const LANDLORD_MIGRATIONS = [__dirname + '/../migrations/landlord/*.js'];

async function withDataSource(opts: DataSourceOptions, fn: (ds: DataSource) => Promise<void>) {
  const ds = new DataSource(opts);
  await ds.initialize();
  try {
    await fn(ds);
  } finally {
    await ds.destroy();
  }
}

/** Record the baseline as applied on a schema that was cloned from `public`
 *  (so runMigrations() skips its CREATE TABLEs). No-op on fresh schemas. */
async function baselineIfCloned(ds: DataSource, schema: string) {
  const [{ built }] = await ds.query(
    `SELECT to_regclass('"${schema}"."${MARKER_TABLE}"') IS NOT NULL AS built`,
  );
  if (!built) return; // fresh schema → let the baseline build it
  await ds.query(
    `CREATE TABLE IF NOT EXISTS "${schema}"."migrations" ` +
      `("id" SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, "name" character varying NOT NULL)`,
  );
  const existing = await ds.query(
    `SELECT 1 FROM "${schema}"."migrations" WHERE "name" = $1 LIMIT 1`,
    [BASELINE.name],
  );
  if (!existing.length) {
    await ds.query(
      `INSERT INTO "${schema}"."migrations" ("timestamp", "name") VALUES ($1, $2)`,
      [BASELINE.timestamp, BASELINE.name],
    );
    console.log(`   · ${schema}: recorded baseline as applied (cloned schema)`);
  }
}

async function main() {
  const failures: string[] = [];

  // 1) Landlord DB (erp_landlord)
  console.log('[migrate] 1/3 landlord database…');
  await withDataSource(
    { ...CONN, database: LANDLORD_DB, migrations: LANDLORD_MIGRATIONS } as DataSourceOptions,
    async (ds) => {
      const ran = await ds.runMigrations({ transaction: 'each' });
      console.log(`   · landlord: ${ran.length} migration(s) applied`);
    },
  );

  // 2) Tenant template (erp_db · public) — ensure uuid-ossp, then migrate
  console.log('[migrate] 2/3 tenant template (public)…');
  await withDataSource(
    {
      ...CONN,
      database: TENANT_DB,
      extra: { options: '-c search_path=public' },
      migrations: TENANT_MIGRATIONS,
    } as DataSourceOptions,
    async (ds) => {
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      const ran = await ds.runMigrations({ transaction: 'each' });
      console.log(`   · public: ${ran.length} migration(s) applied`);
    },
  );

  // 3) Every tenant schema (from the landlord `tenants` table)
  console.log('[migrate] 3/3 tenant schemas…');
  let schemas: string[] = [];
  await withDataSource(
    { ...CONN, database: LANDLORD_DB } as DataSourceOptions,
    async (ds) => {
      const rows = await ds.query(
        `SELECT "schema_name" FROM "tenants" WHERE "schema_name" IS NOT NULL`,
      );
      schemas = rows.map((r: { schema_name: string }) => r.schema_name);
    },
  );
  console.log(`   · ${schemas.length} tenant schema(s) to check`);

  for (const schema of schemas) {
    if (!SCHEMA_RE.test(schema)) {
      console.warn(`   · SKIP invalid schema name: ${JSON.stringify(schema)}`);
      continue;
    }
    try {
      await withDataSource(
        {
          ...CONN,
          database: TENANT_DB,
          // pin search_path for the whole connection: tenant schema first, then
          // public so the baseline's uuid_generate_v4() (uuid-ossp in public) resolves.
          extra: { options: `-c search_path=${schema},public` },
          migrations: TENANT_MIGRATIONS,
        } as DataSourceOptions,
        async (ds) => {
          await baselineIfCloned(ds, schema);
          const ran = await ds.runMigrations({ transaction: 'each' });
          if (ran.length) console.log(`   · ${schema}: ${ran.length} migration(s) applied`);
        },
      );
    } catch (err) {
      console.error(`   ✗ ${schema}: ${(err as Error).message}`);
      failures.push(schema);
    }
  }

  if (failures.length) {
    console.error(`[migrate] FAILED on ${failures.length} schema(s): ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('[migrate] complete — all schemas up to date.');
}

main().catch((err) => {
  console.error('[migrate] fatal:', err);
  process.exit(1);
});
