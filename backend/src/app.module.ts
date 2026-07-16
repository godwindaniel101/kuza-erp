import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  addTransactionalDataSource,
  deleteDataSourceByName,
} from 'typeorm-transactional';
import { I18nModule } from 'nestjs-i18n';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { i18nConfig } from './config/i18n.config';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RmsModule } from './modules/rms/rms.module';
import { ImsModule } from './modules/ims/ims.module';
import { HrmsModule } from './modules/hrms/hrms.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { BillingModule } from './modules/billing/billing.module';
import { InsightsModule } from './modules/insights/insights.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MenuSitesModule } from './modules/menu-sites/menu-sites.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommonModule } from './common/common.module';
import { LandlordModule } from './common/landlord/landlord.module';
import { TenantModule } from './common/tenant/tenant.module';
import { TenantGuard } from './common/tenant/tenant.guard';
import { TenantTransactionInterceptor } from './common/tenant/tenant-transaction.interceptor';
import { AppController } from './app.controller';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
      // Register the DataSource with typeorm-transactional so request-scoped
      // transactions (and tenant schema pinning) work across all repositories.
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid TypeORM options for transactional DataSource');
        }
        // TypeORM re-invokes this factory on connection retries (e.g. the DB
        // isn't up yet when the app boots). addTransactionalDataSource keeps
        // a module-global registry, so without deregistering first every
        // retry would throw 'DataSource with name "default" has already
        // added' — masking the real connection error and making the retry
        // loop unable to ever succeed.
        deleteDataSourceByName('default');
        return addTransactionalDataSource(new DataSource(options));
      },
    }),
    I18nModule.forRoot(i18nConfig()),
    LandlordModule,
    TenantModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RmsModule,
    ImsModule,
    HrmsModule,
    NotificationsModule,
    DashboardModule,
    SettingsModule,
    ProfileModule,
    AccountingModule,
    CustomersModule,
    InvoicingModule,
    BillingModule,
    InsightsModule,
    IntegrationsModule,
    MenuSitesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    // JWT Auth Guard runs first to authenticate users
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Tenant Guard runs second to set up tenant context
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    // Permissions Guard runs last in the guard chain, after JwtAuthGuard has
    // populated request.user. Global registration closes the "forgotten
    // @UseGuards = open endpoint" gap: @Public() routes are open, all other
    // routes require a valid JWT (enforced by JwtAuthGuard), and IF a
    // handler/controller declares @RequirePermissions(...) those permissions
    // are enforced. Routes with no @RequirePermissions remain allowed for any
    // authenticated user — the guard returns true when no permissions metadata
    // is present, preserving today's behavior (no default-deny). Per-controller
    // @UseGuards(PermissionsGuard) still work and are now redundant.
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Registered last so it sits closest to the route handler: it wraps the
    // handler in a transaction and pins the tenant schema for the request.
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantTransactionInterceptor,
    },
  ],
})
export class AppModule {}

