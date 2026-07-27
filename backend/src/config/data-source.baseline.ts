import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { SnakeCaseNamingStrategy } from '../common/database/snake-naming.strategy';

/**
 * CLI-ONLY DataSource used to GENERATE the baseline `public` schema migration.
 *
 * Why this exists (and is separate from data-source.ts):
 *  - The `public` schema is the canonical tenant TEMPLATE built by dev
 *    `synchronize` on the DEFAULT connection. It contains ONLY the tenant/
 *    business entities (75 tables).
 *  - The landlord-scoped entities (tenants, landlord_users, plans, *_subscriptions,
 *    app_access_requests, integration_webhook_routes, menu_slug_routes) live on a
 *    SEPARATE `landlord` connection (erp_landlord DB) and must NOT be in `public`.
 *  - The `network_*` entities are not synchronized into `public` either.
 *  - It also applies SnakeCaseNamingStrategy (matching database.config.ts) which
 *    the plain data-source.ts omits — required so generated names match reality.
 *
 * So this DataSource loads every *.entity.ts EXCEPT the landlord/network ones,
 * giving the generator exactly the default-connection entity set.
 */
config();

const SRC_ROOT = path.resolve(__dirname, '..');

// Directories whose entities belong to OTHER databases / are not in `public`.
const EXCLUDE_DIRS = [
  path.join('modules', 'network'),
  path.join('modules', 'billing'),
  path.join('common', 'landlord'),
];

// Individual landlord-connection entities that live inside otherwise-public modules.
const EXCLUDE_FILES = [
  path.join('modules', 'menu-sites', 'entities', 'menu-slug-route.entity.ts'),
  path.join('modules', 'integrations', 'entities', 'landlord-webhook-route.entity.ts'),
];

function collectEntityFiles(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) collectEntityFiles(full, acc);
    else if (name.endsWith('.entity.ts')) acc.push(full);
  }
  return acc;
}

const entities = collectEntityFiles(SRC_ROOT).filter((file) => {
  const rel = path.relative(SRC_ROOT, file);
  if (EXCLUDE_DIRS.some((d) => rel.startsWith(d + path.sep))) return false;
  if (EXCLUDE_FILES.some((f) => rel === f)) return false;
  return true;
});

export const BaselineDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_db',
  entities,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  namingStrategy: new SnakeCaseNamingStrategy(),
});
