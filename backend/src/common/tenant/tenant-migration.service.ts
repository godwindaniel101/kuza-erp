import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Provisions and switches tenant schemas.
 *
 * Schema shape is owned entirely by the entities: dev `synchronize` builds the
 * canonical `public` schema, and every NEW tenant is cloned from it via
 * `CREATE TABLE ... (LIKE public.<t> INCLUDING ALL)`. There is deliberately NO
 * boot-time column/table "patching" of existing tenant schemas — the schema is
 * rebuilt clean from the entities (see the 2026-07-23 single-baseline rebuild).
 */
@Injectable()
export class TenantMigrationService {
  constructor(private readonly dataSource: DataSource) {}

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
    // In the schema-per-tenant model, only `users` carries a business_id column;
    // employees / inventory_items / orders are isolated by schema and have no
    // business_id (and employees has no is_active). Index only real columns —
    // the previous list warned on every tenant create for the missing ones.
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_business_id ON "${schemaName}".users (business_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_email ON "${schemaName}".users (email)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_orders_created_at ON "${schemaName}".orders (created_at)`,
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
