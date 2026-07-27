import { Module, Global } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getLandlordDatabaseConfig } from '../../config/landlord-database.config';
import { Tenant } from './entities/tenant.entity';
import { LandlordUser } from './entities/landlord-user.entity';
import { LandlordService } from './services/landlord.service';
import { Plan } from '../../modules/billing/entities/plan.entity';
import { TenantSubscription } from '../../modules/billing/entities/tenant-subscription.entity';
import { SubscriptionPayment } from '../../modules/billing/entities/subscription-payment.entity';
import { AppAccessRequest } from '../../modules/billing/entities/app-access-request.entity';
import { LandlordWebhookRoute } from '../../modules/integrations/entities/landlord-webhook-route.entity';
import { MenuSlugRoute } from '../../modules/menu-sites/entities/menu-slug-route.entity';
import { NetworkBusiness } from '../../modules/network/entities/network-business.entity';
import { TradePartnership } from '../../modules/network/entities/trade-partnership.entity';
import { NetworkOrder } from '../../modules/network/entities/network-order.entity';
import { NetworkOrderItem } from '../../modules/network/entities/network-order-item.entity';
import { NetworkCatalogItem } from '../../modules/network/entities/network-catalog-item.entity';
import { NetworkWallet } from '../../modules/network/entities/network-wallet.entity';
import { NetworkWalletEntry } from '../../modules/network/entities/network-wallet-entry.entity';

/**
 * Landlord module - handles tenant authentication and management
 * Uses separate database connection
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: 'landlord',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = getLandlordDatabaseConfig(configService);
        // Landlord connection uses an explicit entity list (autoLoadEntities
        // is false) — register billing's landlord-scoped entities here.
        return {
          ...config,
          entities: [
            ...((config.entities as any[]) || []),
            Plan,
            TenantSubscription,
            SubscriptionPayment,
            AppAccessRequest,
            LandlordWebhookRoute,
            MenuSlugRoute,
            NetworkBusiness,
            TradePartnership,
            NetworkOrder,
            NetworkOrderItem,
            NetworkCatalogItem,
            NetworkWallet,
            NetworkWalletEntry,
          ],
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Tenant, LandlordUser], 'landlord'),
  ],
  providers: [
    LandlordService,
    {
      provide: 'LANDLORD_CONNECTION',
      useFactory: (dataSource: DataSource) => {
        return dataSource;
      },
      inject: [getDataSourceToken('landlord')],
    },
  ],
  exports: [LandlordService, TypeOrmModule],
})
export class LandlordModule {}
