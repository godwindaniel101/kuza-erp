import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FeatureGateGuard } from './guards/feature-gate.guard';
import { Plan } from './entities/plan.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { User } from '../../common/entities/user.entity';
import { Branch } from '../../common/entities/branch.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';

/**
 * SaaS billing. Plan and TenantSubscription are LANDLORD-scoped — they live
 * in the landlord (public) database shared by all tenants, so their
 * repositories are registered on the 'landlord' connection (the entities are
 * added to that connection's entity list in landlord.module.ts). Usage counts
 * (users/branches/items) come from tenant-connection repositories, which the
 * global TenantTransactionInterceptor scopes to the caller's schema.
 *
 * @Global (like CommonModule/LandlordModule) so FeatureGateGuard and
 * BillingService resolve in every feature module that class-decorates its
 * controller with @RequireApp — no per-module BillingModule import needed.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, TenantSubscription], 'landlord'),
    TypeOrmModule.forFeature([User, Branch, InventoryItem]),
  ],
  controllers: [BillingController],
  providers: [BillingService, FeatureGateGuard],
  exports: [BillingService, FeatureGateGuard],
})
export class BillingModule {}
