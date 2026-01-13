import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantGuard } from './tenant.guard';

/**
 * Tenant module - handles tenant database schema switching
 */
@Global()
@Module({
  imports: [TypeOrmModule],
  providers: [TenantConnectionService, TenantGuard],
  exports: [TenantConnectionService, TenantGuard],
})
export class TenantModule {}
