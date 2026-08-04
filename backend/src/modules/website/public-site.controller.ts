import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SiteTenantGuard } from './guards/site-tenant.guard';
import { WebsiteService } from './website.service';

/**
 * UNAUTHENTICATED public website endpoint — what a visitor's browser hits (via
 * the frontend /site/:slug page's SSR fetch).
 *
 * @Public() opts out of the global JwtAuthGuard and TenantGuard; SiteTenantGuard
 * resolves slug → tenant via the landlord website_slug_routes table and attaches
 * request.tenant, which the global TenantTransactionInterceptor uses to pin the
 * tenant schema for all repository reads in the handler. No auth, no cookies.
 */
@ApiTags('Public Website')
@Public()
@Controller('public/site')
@UseGuards(SiteTenantGuard)
export class PublicSiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get(':slug')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Public website payload for a published site slug' })
  async getPublicSite(@Param('slug') slug: string) {
    const data = await this.websiteService.getPublicSiteBySlug(slug);
    return { success: true, data };
  }
}
