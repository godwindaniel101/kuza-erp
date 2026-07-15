import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MenuSiteTenantGuard } from './guards/menu-site-tenant.guard';
import { MenuSitesService } from './menu-sites.service';

/**
 * UNAUTHENTICATED public menu endpoint — what a guest's phone hits after
 * scanning the QR code (via the frontend /m/:slug page's SSR fetch).
 *
 * @Public() opts out of the global JwtAuthGuard and TenantGuard;
 * MenuSiteTenantGuard resolves slug → tenant via the landlord
 * menu_slug_routes table and attaches request.tenant, which the global
 * TenantTransactionInterceptor uses to pin the tenant schema for all
 * repository reads in the handler. No auth, no cookies.
 */
@ApiTags('Public Menu')
@Public()
@Controller('public/menu')
@UseGuards(MenuSiteTenantGuard)
export class PublicMenuController {
  constructor(private readonly menuSitesService: MenuSitesService) {}

  @Get(':slug')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Public menu payload for a published venue slug' })
  async getPublicMenu(@Param('slug') slug: string) {
    const data = await this.menuSitesService.getPublicMenuBySlug(slug);
    return { success: true, data };
  }
}
