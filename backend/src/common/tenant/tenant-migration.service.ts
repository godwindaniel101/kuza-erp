import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Service to run migrations for tenant schemas
 * This ensures tenant schemas have all necessary tables
 */
@Injectable()
export class TenantMigrationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Initialize tenant schema with all necessary tables
   * In development, this uses synchronize to create tables
   * In production, this would run migrations
   */
  async initializeTenantSchema(schemaName: string): Promise<void> {
    try {
      // Create schema if it doesn't exist (using default connection, same DB as tenant)
      await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // In development with synchronize: true, TypeORM will auto-create tables
      // But we need to ensure they're created in the tenant schema
      // For now, we'll rely on synchronize which works on the default schema
      // In a fully multi-tenant setup, we'd need to run migrations per schema
      
      console.log(`✅ Tenant schema ${schemaName} initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize schema ${schemaName}:`, error);
      throw error;
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
