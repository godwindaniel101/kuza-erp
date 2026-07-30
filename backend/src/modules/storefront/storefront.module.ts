import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontController } from './storefront.controller';
import { PublicStoreController } from './public-store.controller';
import { StorefrontService } from './storefront.service';
import { StoreTenantGuard } from './guards/store-tenant.guard';
import { StorefrontSite } from './entities/storefront-site.entity';
import { StorefrontSlugRoute } from './entities/storefront-slug-route.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { InventoryCategory } from '../ims/entities/inventory-category.entity';
import { Business } from '../../common/entities/business.entity';

/**
 * Kuza Storefront (shop vertical) — public online store.
 *
 * StorefrontSite (+ the reused IMS inventory entities) are TENANT-scoped and
 * live on the default connection; StorefrontSlugRoute is LANDLORD-scoped and
 * registered on the 'landlord' connection (its entity is added to that
 * connection's entity list in landlord.module.ts, mirroring MenuSlugRoute).
 *
 * Does NOT wire the order engine or payments (a later step).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      StorefrontSite,
      InventoryItem,
      InventoryCategory,
      Business,
    ]),
    TypeOrmModule.forFeature([StorefrontSlugRoute], 'landlord'),
  ],
  controllers: [StorefrontController, PublicStoreController],
  providers: [StorefrontService, StoreTenantGuard],
  exports: [StorefrontService],
})
export class StorefrontModule {}
