import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { FeatureGateGuard } from './guards/feature-gate.guard';
import { Plan } from './entities/plan.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { AppAccessRequest } from './entities/app-access-request.entity';
import { PricingConfig } from './entities/pricing-config.entity';
import { User } from '../../common/entities/user.entity';
import { Branch } from '../../common/entities/branch.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { PaystackAdapter } from '../integrations/adapters/paystack.adapter';

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
    TypeOrmModule.forFeature(
      [Plan, TenantSubscription, SubscriptionPayment, AppAccessRequest, PricingConfig],
      'landlord',
    ),
    TypeOrmModule.forFeature([User, Branch, InventoryItem]),
  ],
  controllers: [BillingController, BillingWebhookController],
  // PaystackAdapter is stateless (no injected deps beyond a Logger); providing
  // it here reuses the exact same adapter code — including its HMAC-SHA512
  // webhook verification — without importing IntegrationsModule.
  providers: [BillingService, FeatureGateGuard, PaystackAdapter],
  exports: [BillingService, FeatureGateGuard],
})
export class BillingModule {}
