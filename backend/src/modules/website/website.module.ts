import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsiteController } from './website.controller';
import { PublicSiteController } from './public-site.controller';
import { WebsiteService } from './website.service';
import { SiteTenantGuard } from './guards/site-tenant.guard';
import { WebsiteSite } from './entities/website-site.entity';
import { WebsiteSlugRoute } from './entities/website-slug-route.entity';
import { Business } from '../../common/entities/business.entity';

/**
 * Kuza Website (website common app) — a simple per-tenant marketing site.
 *
 * WebsiteSite is TENANT-scoped (default connection); WebsiteSlugRoute is
 * LANDLORD-scoped and registered on the 'landlord' connection (its entity is
 * added to that connection's entity list in landlord.module.ts, mirroring
 * StorefrontSlugRoute). Images upload via the @Global StorageService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WebsiteSite, Business]),
    TypeOrmModule.forFeature([WebsiteSlugRoute], 'landlord'),
  ],
  controllers: [WebsiteController, PublicSiteController],
  providers: [WebsiteService, SiteTenantGuard],
  exports: [WebsiteService],
})
export class WebsiteModule {}
