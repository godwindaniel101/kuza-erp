import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicMarketController } from './public-market.controller';
import { PublicMarketService } from './public-market.service';
import { StorefrontSlugRoute } from '../storefront/entities/storefront-slug-route.entity';

/**
 * Kuza public marketplace (Phase 1 — browse only). Cross-tenant, read-only
 * aggregation of sellable items across published storefronts.
 *
 * Only needs the LANDLORD-scoped StorefrontSlugRoute repository (the list of
 * published-store candidates); each tenant's items are read via raw
 * per-schema query runners in the service. No tenant entities are registered
 * here — this module never pins a tenant. NO order engine, NO payments.
 */
@Module({
  imports: [TypeOrmModule.forFeature([StorefrontSlugRoute], 'landlord')],
  controllers: [PublicMarketController],
  providers: [PublicMarketService],
})
export class PublicMarketModule {}
