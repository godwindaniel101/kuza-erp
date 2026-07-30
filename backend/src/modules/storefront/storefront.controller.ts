import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/guards/permissions.guard';
import {
  FeatureGateGuard,
  RequireApp,
} from '../billing/guards/feature-gate.guard';
import { StorefrontService, TenantContext } from './storefront.service';
import { UpdateStorefrontDto } from './dto/update-storefront.dto';

/**
 * Authenticated management API for the tenant's Kuza Storefront
 * (one store per tenant for v1), gated to the 'shop' app.
 */
@ApiTags('Storefront')
@Controller('storefront')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('shop')
@ApiBearerAuth()
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  private tenantFrom(req: any): TenantContext {
    return { id: req.tenant.id, schemaName: req.tenant.schemaName };
  }

  @Get()
  @RequirePermissions('storefront.view')
  @ApiOperation({
    summary: "Get the tenant's storefront settings (auto-created on first read)",
  })
  async getSite(@Req() req: any) {
    const site = await this.storefrontService.getOrCreateSite(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: {
        ...site,
        publicUrl: this.storefrontService.publicUrl(site.slug),
      },
    };
  }

  @Put()
  @RequirePermissions('storefront.manage')
  @ApiOperation({ summary: 'Update storefront settings (store info, template, slug…)' })
  async update(@Req() req: any, @Body() dto: UpdateStorefrontDto) {
    const site = await this.storefrontService.updateSite(
      this.tenantFrom(req),
      dto,
      req.businessId,
    );
    return {
      success: true,
      data: {
        ...site,
        publicUrl: this.storefrontService.publicUrl(site.slug),
      },
      message: 'Storefront updated',
    };
  }

  @Post('publish')
  @RequirePermissions('storefront.publish')
  @ApiOperation({ summary: 'Publish the storefront (public URL goes live)' })
  async publish(@Req() req: any) {
    const site = await this.storefrontService.publish(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: {
        ...site,
        publicUrl: this.storefrontService.publicUrl(site.slug),
      },
      message: 'Storefront published',
    };
  }

  @Post('unpublish')
  @RequirePermissions('storefront.publish')
  @ApiOperation({ summary: 'Unpublish the storefront (public URL 404s)' })
  async unpublish(@Req() req: any) {
    const site = await this.storefrontService.unpublish(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: {
        ...site,
        publicUrl: this.storefrontService.publicUrl(site.slug),
      },
      message: 'Storefront unpublished',
    };
  }

  @Get('products')
  @RequirePermissions('storefront.view')
  @ApiOperation({
    summary: 'Preview the sellable, in-stock products the storefront lists',
  })
  async products(@Req() req: any) {
    const data = await this.storefrontService.getProducts(
      this.tenantFrom(req),
      req.businessId,
    );
    return { success: true, data };
  }
}
