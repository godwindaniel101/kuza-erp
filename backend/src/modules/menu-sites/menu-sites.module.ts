import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuSitesController } from './menu-sites.controller';
import { PublicMenuController } from './public-menu.controller';
import { MenuSitesService } from './menu-sites.service';
import { MenuSiteTenantGuard } from './guards/menu-site-tenant.guard';
import { MenuSite } from './entities/menu-site.entity';
import { MenuSlugRoute } from './entities/menu-slug-route.entity';
import { Menu } from '../rms/entities/menu.entity';
import { MenuCategory } from '../rms/entities/menu-category.entity';
import { MenuItem } from '../rms/entities/menu-item.entity';
import { InventoryItem } from '../ims/entities/inventory-item.entity';
import { InventorySubcategory } from '../ims/entities/inventory-subcategory.entity';
import { Business } from '../../common/entities/business.entity';

/**
 * Kuza Menu — QR-code public menu sites.
 *
 * MenuSite (+ the reused RMS menu entities) are TENANT-scoped and live on
 * the default connection; MenuSlugRoute is LANDLORD-scoped and registered on
 * the 'landlord' connection (its entity is added to that connection's entity
 * list in landlord.module.ts, mirroring billing's Plan/TenantSubscription).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([MenuSite, Menu, MenuCategory, MenuItem, InventoryItem, InventorySubcategory, Business]),
    TypeOrmModule.forFeature([MenuSlugRoute], 'landlord'),
  ],
  controllers: [MenuSitesController, PublicMenuController],
  providers: [MenuSitesService, MenuSiteTenantGuard],
  exports: [MenuSitesService],
})
export class MenuSitesModule {}
