import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StoreTenantGuard } from './guards/store-tenant.guard';
import { StorefrontService } from './storefront.service';

/**
 * UNAUTHENTICATED public storefront endpoint — what a shopper's browser hits
 * (via the frontend /s/:slug page's SSR fetch).
 *
 * @Public() opts out of the global JwtAuthGuard and TenantGuard;
 * StoreTenantGuard resolves slug → tenant via the landlord
 * storefront_slug_routes table and attaches request.tenant, which the global
 * TenantTransactionInterceptor uses to pin the tenant schema for all repository
 * reads in the handler. No auth, no cookies.
 */
@ApiTags('Public Storefront')
@Public()
@Controller('public/store')
@UseGuards(StoreTenantGuard)
export class PublicStoreController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get(':slug')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Public storefront payload for a published store slug' })
  async getPublicStore(@Param('slug') slug: string) {
    const data = await this.storefrontService.getPublicStoreBySlug(slug);
    return { success: true, data };
  }
}
