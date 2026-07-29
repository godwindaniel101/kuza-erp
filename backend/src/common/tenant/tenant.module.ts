import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantGuard } from './tenant.guard';
import { TenantMigrationService } from './tenant-migration.service';

/**
 * Tenant module - handles tenant database schema switching
 */
@Global()
@Module({
  imports: [TypeOrmModule],
  providers: [TenantConnectionService, TenantGuard, TenantMigrationService],
  exports: [TenantConnectionService, TenantGuard, TenantMigrationService],
})
export class TenantModule {}
