import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';
import { MenuSitesService, TenantContext } from './menu-sites.service';
import { UpdateMenuSiteDto } from './dto/update-menu-site.dto';
import { UploadLogoDto } from './dto/upload-logo.dto';

/**
 * Authenticated management API for the tenant's Kuza Menu site
 * (one site per tenant for v1).
 */
@ApiTags('Menu Sites')
@Controller('menu-sites')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('rms')
@ApiBearerAuth()
export class MenuSitesController {
  constructor(private readonly menuSitesService: MenuSitesService) {}

  private tenantFrom(req: any): TenantContext {
    return { id: req.tenant.id, schemaName: req.tenant.schemaName };
  }

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: "Get the tenant's menu site (auto-created on first read)" })
  async getSite(@Req() req: any) {
    const site = await this.menuSitesService.getOrCreateSite(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.menuSitesService.publicUrl(site.slug) },
    };
  }

  @Get('preview')
  @RequirePermissions('settings.view')
  @ApiOperation({
    summary: 'Preview the exact payload the public menu page will render',
  })
  async preview(@Req() req: any) {
    const data = await this.menuSitesService.getPreview(
      this.tenantFrom(req),
      req.businessId,
    );
    return { success: true, data };
  }

  @Get('qr')
  @RequirePermissions('settings.view')
  @ApiOperation({
    summary: 'QR code — intentionally not implemented server-side',
  })
  getQr() {
    // QR generation is handled client-side by the frontend `qrcode` package
    // (zero server dependencies). Kept as an explicit 501 so the contract is
    // documented rather than a silent 404.
    throw new HttpException(
      {
        success: false,
        message:
          'QR generation is client-side. Use the frontend qrcode package with the publicUrl from GET /menu-sites.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Patch()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update menu site settings (theme, venue info, slug…)' })
  async update(@Req() req: any, @Body() dto: UpdateMenuSiteDto) {
    const site = await this.menuSitesService.updateSite(
      this.tenantFrom(req),
      dto,
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.menuSitesService.publicUrl(site.slug) },
      message: 'Menu site updated',
    };
  }

  @Post('logo')
  @RequirePermissions('settings.edit')
  @ApiOperation({
    summary: 'Upload a venue logo (base64 data URL) → stored /uploads path',
  })
  async uploadLogo(@Body() dto: UploadLogoDto) {
    const url = await this.menuSitesService.uploadLogo(dto.dataUrl);
    return { success: true, url };
  }

  @Post('publish')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Publish the menu site (public URL goes live)' })
  async publish(@Req() req: any) {
    const site = await this.menuSitesService.publish(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.menuSitesService.publicUrl(site.slug) },
      message: 'Menu published',
    };
  }

  @Post('unpublish')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Unpublish the menu site (public URL 404s)' })
  async unpublish(@Req() req: any) {
    const site = await this.menuSitesService.unpublish(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.menuSitesService.publicUrl(site.slug) },
      message: 'Menu unpublished',
    };
  }
}
