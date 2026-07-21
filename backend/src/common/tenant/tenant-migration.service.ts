import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Service to run migrations for tenant schemas
 * This ensures tenant schemas have all necessary tables
 */
@Injectable()
export class TenantMigrationService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Dev `synchronize` only alters the PUBLIC schema; columns added to shared
   * entities must be propagated to every existing tenant schema or any
   * TypeORM read of that entity (e.g. the login user→business join) fails
   * with a missing-column error. New tenant schemas inherit the columns via
   * `LIKE public` in initializeTenantSchema. Nullable ADD COLUMN is instant,
   * so this is safe on every boot.
   */
  async onModuleInit(): Promise<void> {
    await this.ensureTenantSchemaColumns();
    await this.ensureTenantSchemaTables();
  }

  /**
   * New tenant-scoped tables added after a tenant schema was first created are
   * only synchronized into PUBLIC by dev `synchronize`; existing tenant schemas
   * inherit them here. New tenants pick them up via `LIKE public` in
   * initializeTenantSchema. `CREATE TABLE IF NOT EXISTS ... (LIKE public.<t>
   * INCLUDING ALL)` is idempotent, so this is safe on every boot.
   */
  private async ensureTenantSchemaTables(): Promise<void> {
    // Tenant tables introduced after initial schema creation go here.
    const tableAdditions: string[] = [
      'inventory_item_components',
      'payment_methods',
      'payment_accounts',
      'payment_transactions',
      'payment_settlement',
      'two_factor',
      'reservations',
    ];

    for (const table of tableAdditions) {
      try {
        // Skip if the source table doesn't exist in public yet (synchronize off).
        const [{ exists }]: Array<{ exists: boolean }> = await this.dataSource.query(
          `SELECT EXISTS (
             SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = $1
           ) AS exists`,
          [table],
        );
        if (!exists) continue;

        // A tenant schema is one that has the `businesses` table (same notion
        // the column-additions step above relies on).
        const schemas: Array<{ table_schema: string }> = await this.dataSource.query(
          `SELECT table_schema FROM information_schema.tables
           WHERE table_name = 'businesses'
             AND table_schema NOT IN ('public', 'information_schema', 'pg_catalog')`,
        );
        let created = 0;
        for (const { table_schema } of schemas) {
          await this.dataSource.query(
            `CREATE TABLE IF NOT EXISTS "${table_schema}"."${table}"
             (LIKE public."${table}" INCLUDING ALL)`,
          );
          created += 1;
        }
        if (created > 0) {
          console.log(`✅ Ensured table ${table} on ${created} tenant schema(s)`);
        }
      } catch (error) {
        console.error(`❌ Failed to ensure tenant table ${table}:`, error);
        throw error;
      }
    }
  }

  private async ensureTenantSchemaColumns(): Promise<void> {
    // Column additions to shared tenant entities go here (name, table, DDL).
    const columnAdditions = [
      {
        table: 'businesses',
        ddl: `ADD COLUMN IF NOT EXISTS "enabled_apps" jsonb`,
      },
      // Warehouse MS v1: row/rack ("bin") location on inventory tables.
      {
        table: 'inventory_items',
        ddl: `ADD COLUMN IF NOT EXISTS "bin_location" character varying`,
      },
      {
        table: 'branch_inventory_items',
        ddl: `ADD COLUMN IF NOT EXISTS "bin_location" character varying`,
      },
      // Item make-up: items can be sold-at-POS or ingredient-only.
      {
        table: 'inventory_items',
        ddl: `ADD COLUMN IF NOT EXISTS "sell_at_pos" boolean NOT NULL DEFAULT true`,
      },
      // Audit trail: created_by / updated_by (+ denormalized name for display).
      { table: 'inventory_items', ddl: `ADD COLUMN IF NOT EXISTS "created_by" uuid` },
      { table: 'inventory_items', ddl: `ADD COLUMN IF NOT EXISTS "created_by_name" character varying` },
      { table: 'inventory_items', ddl: `ADD COLUMN IF NOT EXISTS "updated_by" uuid` },
      { table: 'inventory_items', ddl: `ADD COLUMN IF NOT EXISTS "updated_by_name" character varying` },
      { table: 'orders', ddl: `ADD COLUMN IF NOT EXISTS "created_by" uuid` },
      { table: 'orders', ddl: `ADD COLUMN IF NOT EXISTS "created_by_name" character varying` },
      { table: 'orders', ddl: `ADD COLUMN IF NOT EXISTS "updated_by" uuid` },
      { table: 'orders', ddl: `ADD COLUMN IF NOT EXISTS "updated_by_name" character varying` },
      // RMS recipes: a dish order line carries menu_item_id (not an inventory
      // item), so inventory_item_id must also become nullable. DROP NOT NULL is
      // a no-op when the column is already nullable, so it's safe every boot.
      {
        table: 'order_items',
        ddl: `ADD COLUMN IF NOT EXISTS "menu_item_id" uuid`,
      },
      {
        table: 'order_items',
        ddl: `ALTER COLUMN "inventory_item_id" DROP NOT NULL`,
      },
      // Menu items: subcategory name for two-level (category → subcategory) menus.
      { table: 'menu_items', ddl: `ADD COLUMN IF NOT EXISTS "subcategory" character varying` },
      // Menu sites: extra social links + a feedback link (used by the guest
      // menu templates, e.g. Escape's Instagram/Feedback tiles).
      { table: 'menu_sites', ddl: `ADD COLUMN IF NOT EXISTS "facebook" character varying` },
      { table: 'menu_sites', ddl: `ADD COLUMN IF NOT EXISTS "tiktok" character varying` },
      { table: 'menu_sites', ddl: `ADD COLUMN IF NOT EXISTS "twitter" character varying` },
      { table: 'menu_sites', ddl: `ADD COLUMN IF NOT EXISTS "feedback_url" character varying` },
    ];

    for (const { table, ddl } of columnAdditions) {
      try {
        const schemas: Array<{ table_schema: string }> =
          await this.dataSource.query(
            `SELECT table_schema FROM information_schema.tables
             WHERE table_name = $1
               AND table_schema NOT IN ('public', 'information_schema', 'pg_catalog')`,
            [table],
          );
        for (const { table_schema } of schemas) {
          await this.dataSource.query(
            `ALTER TABLE "${table_schema}"."${table}" ${ddl}`,
          );
        }
        if (schemas.length > 0) {
          console.log(
            `✅ Ensured ${table} columns on ${schemas.length} tenant schema(s)`,
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to ensure tenant columns on ${table}:`,
          error,
        );
        throw error;
      }
    }
  }

  /**
   * Initialize tenant schema with all necessary tables
   * This copies the complete table structure from public schema to tenant schema
   */
  async initializeTenantSchema(schemaName: string): Promise<void> {
    try {
      // Create schema if it doesn't exist
      await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // Copy all tables from public schema to tenant schema
      await this.copyTablesFromPublicSchema(schemaName);
      
      console.log(`✅ Tenant schema ${schemaName} initialized with all tables`);
    } catch (error) {
      console.error(`❌ Failed to initialize schema ${schemaName}:`, error);
      throw error;
    }
  }

  /**
   * Copy all tenant-specific tables from public schema to a tenant schema
   */
  private async copyTablesFromPublicSchema(schemaName: string): Promise<void> {
    // Tables that should NOT be copied (system/shared tables)
    const excludedTables = [
      'migrations',
      'typeorm_metadata'
    ];

    // Get all tables from public schema
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (${excludedTables.map(t => `'${t}'`).join(', ')})
      ORDER BY table_name
    `;

    const tables = await this.dataSource.query(tablesQuery);

    for (const table of tables) {
      const tableName = table.table_name;
      
      try {
        // Create table in tenant schema with same structure as public schema
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" 
          (LIKE public."${tableName}" INCLUDING ALL)
        `;
        
        await this.dataSource.query(createTableQuery);
        
        // Copy any default/system data that should exist in all tenants
        await this.copySystemData(schemaName, tableName);
        
        console.log(`  ✅ Created table ${schemaName}.${tableName}`);
      } catch (error) {
        console.error(`  ❌ Failed to create table ${schemaName}.${tableName}:`, error);
      }
    }

    // Create indexes for performance
    await this.createTenantIndexes(schemaName);
  }

  /**
   * Copy system/default data that should exist in all tenant schemas
   */
  private async copySystemData(schemaName: string, tableName: string): Promise<void> {
    try {
      // Copy roles and permissions (system data that all tenants need)
      if (tableName === 'roles') {
        const systemRoles = await this.dataSource.query(`
          SELECT * FROM public.roles 
          WHERE name IN ('admin', 'manager', 'user', 'employee')
        `);
        
        for (const role of systemRoles) {
          await this.dataSource.query(`
            INSERT INTO "${schemaName}".roles (id, created_at, updated_at, name, display_name, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
          `, [role.id, role.created_at, role.updated_at, role.name, role.display_name, role.description]);
        }
      }

      if (tableName === 'permissions') {
        const systemPermissions = await this.dataSource.query(`
          SELECT * FROM public.permissions
        `);
        
        for (const permission of systemPermissions) {
          await this.dataSource.query(`
            INSERT INTO "${schemaName}".permissions (id, created_at, updated_at, name, display_name, resource, action)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [permission.id, permission.created_at, permission.updated_at, permission.name, permission.display_name, permission.resource, permission.action]);
        }
      }

      if (tableName === 'role_permissions') {
        const rolePermissions = await this.dataSource.query(`
          SELECT * FROM public.role_permissions
        `);
        
        for (const rp of rolePermissions) {
          await this.dataSource.query(`
            INSERT INTO "${schemaName}".role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [rp.role_id, rp.permission_id]);
        }
      }
    } catch (error) {
      // Non-critical error - log and continue
      console.log(`  ⚠️ Could not copy system data for ${tableName}:`, error.message);
    }
  }

  /**
   * Create performance indexes for tenant schemas
   */
  private async createTenantIndexes(schemaName: string): Promise<void> {
    const indexes = [
      // Business ID indexes for tenant isolation
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_business_id ON "${schemaName}".users (business_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_employees_business_id ON "${schemaName}".employees (business_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_inventory_items_business_id ON "${schemaName}".inventory_items (business_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_orders_business_id ON "${schemaName}".orders (business_id)`,
      
      // Common query indexes
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_email ON "${schemaName}".users (email)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_orders_created_at ON "${schemaName}".orders (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_employees_active ON "${schemaName}".employees (is_active) WHERE is_active = true`,
    ];

    for (const indexQuery of indexes) {
      try {
        await this.dataSource.query(indexQuery);
      } catch (error) {
        // Indexes might already exist or table might not exist - non-critical
        console.log(`  ⚠️ Could not create index: ${error.message}`);
      }
    }
  }

  /**
   * Switch to tenant schema for queries
   */
  async switchToSchema(schemaName: string): Promise<void> {
    try {
      await this.dataSource.query(`SET search_path TO "${schemaName}", public`);
    } catch (error) {
      console.error(`Failed to switch to schema ${schemaName}:`, error);
      throw error;
    }
  }

  /**
   * Reset to default schema (public)
   */
  async resetSchema(): Promise<void> {
    try {
      await this.dataSource.query(`SET search_path TO public`);
    } catch (error) {
      console.error(`Failed to reset schema:`, error);
      throw error;
    }
  }
}
