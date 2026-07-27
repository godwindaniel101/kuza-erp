import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkBusiness } from './entities/network-business.entity';
import { TradePartnership } from './entities/trade-partnership.entity';
import { NetworkOrder } from './entities/network-order.entity';
import { NetworkOrderItem } from './entities/network-order-item.entity';
import { NetworkCatalogItem } from './entities/network-catalog-item.entity';
import { NetworkWallet } from './entities/network-wallet.entity';
import { NetworkWalletEntry } from './entities/network-wallet-entry.entity';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { NetworkOrdersService } from './network-orders.service';
import { NetworkOrdersController } from './network-orders.controller';
import { NetworkCatalogService } from './network-catalog.service';
import { NetworkCatalogController } from './network-catalog.controller';
import { NetworkWalletService } from './network-wallet.service';
import { NetworkWalletController } from './network-wallet.controller';
import { MarketSettings } from './entities/market-settings.entity';
import { MarketSettingsService } from './market-settings.service';
import { MarketSettingsController } from './market-settings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { Customer } from '../customers/entities/customer.entity';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Branch } from '../../common/entities/branch.entity';
import { OrdersModule } from '../rms/orders/orders.module';

/**
 * Kuza Network (Phase 0) — landlord-scoped cross-tenant B2B layer.
 *
 * NetworkBusiness and TradePartnership are LANDLORD-scoped and registered on
 * the 'landlord' connection (their entities are added to that connection's
 * entity list in landlord.module.ts). LandlordModule and TenantModule are
 * both @Global, so LandlordService and TenantConnectionService are available
 * without extra imports.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        NetworkBusiness,
        TradePartnership,
        NetworkOrder,
        NetworkOrderItem,
        NetworkCatalogItem,
        NetworkWallet,
        NetworkWalletEntry,
      ],
      'landlord',
    ),
    // MarketSettings + Branch are TENANT-scoped — registered on the DEFAULT
    // (per-request tenant) connection. Branch lets accept() resolve the
    // seller's fulfilment branch when materializing a real sale.
    TypeOrmModule.forFeature([Customer, Invoice, MarketSettings, Branch]),
    NotificationsModule,
    InvoicingModule,
    // OrdersModule exports the POS engine (OrdersService) used to materialize an
    // accepted marketplace order into a REAL sale (stock debit + COGS). No
    // circular dependency: OrdersModule is otherwise only used by RmsModule.
    OrdersModule,
  ],
  providers: [
    NetworkService,
    NetworkOrdersService,
    NetworkCatalogService,
    NetworkWalletService,
    MarketSettingsService,
  ],
  controllers: [
    NetworkController,
    NetworkOrdersController,
    NetworkCatalogController,
    NetworkWalletController,
    MarketSettingsController,
  ],
  exports: [
    NetworkService,
    NetworkOrdersService,
    NetworkCatalogService,
    NetworkWalletService,
    MarketSettingsService,
  ],
})
export class NetworkModule {}
