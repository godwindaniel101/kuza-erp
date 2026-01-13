import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Service to manage tenant database schema switching
 * Uses PostgreSQL schema isolation by switching search_path per request
 */
@Injectable()
export class TenantConnectionService implements OnModuleInit {
  private defaultDataSource: DataSource;

  constructor(
    private readonly dataSource: DataSource, // Default tenant connection
  ) {
    this.defaultDataSource = dataSource;
  }

  async onModuleInit() {
    // Initialize default connection
  }

  /**
   * Switch database connection to tenant schema
   * This sets the search_path for PostgreSQL queries
   */
  async switchToTenantSchema(schemaName: string): Promise<void> {
    // Set search_path to tenant schema for this connection
    await this.defaultDataSource.query(`SET search_path TO "${schemaName}", public`);
  }

  /**
   * Reset to default schema (public)
   */
  async resetSchema(): Promise<void> {
    await this.defaultDataSource.query(`SET search_path TO public`);
  }

  /**
   * Get default tenant connection
   */
  getDefaultConnection(): DataSource {
    return this.defaultDataSource;
  }
}
