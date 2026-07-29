import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectionsController } from './connections.controller';
import { WebhooksController } from './webhooks.controller';
import { ConnectionsService } from './connections.service';
import { WebhooksService } from './webhooks.service';
import { WebhookTenantGuard } from './guards/webhook-tenant.guard';
import { PaystackAdapter } from './adapters/paystack.adapter';
import { MonnifyAdapter } from './adapters/monnify.adapter';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationEvent } from './entities/integration-event.entity';
import { LandlordWebhookRoute } from './entities/landlord-webhook-route.entity';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Customer } from '../customers/entities/customer.entity';
import { InvoicingModule } from '../invoicing/invoicing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationConnection,
      IntegrationEvent,
      Invoice,
      Customer,
    ]),
    // Landlord-scoped route table lives on the 'landlord' connection; the
    // entity itself is registered on that connection in
    // common/landlord/landlord.module.ts (same pattern as billing).
    TypeOrmModule.forFeature([LandlordWebhookRoute], 'landlord'),
    InvoicingModule,
  ],
  controllers: [ConnectionsController, WebhooksController],
  providers: [
    ConnectionsService,
    WebhooksService,
    WebhookTenantGuard,
    PaystackAdapter,
    MonnifyAdapter,
  ],
  exports: [ConnectionsService],
})
export class IntegrationsModule {}
