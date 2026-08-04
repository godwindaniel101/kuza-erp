import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/guards/permissions.guard';
import {
  FeatureGateGuard,
  RequireApp,
} from '../billing/guards/feature-gate.guard';
import {
  UploadImageDto,
  UploadedImageFile,
} from '../ims/inventory/dto/upload-image.dto';
import { WebsiteService, TenantContext } from './website.service';
import { UpdateWebsiteDto } from './dto/update-website.dto';

/**
 * Authenticated management API for the tenant's Kuza Website (one site per
 * tenant for v1), gated to the 'website' common app.
 */
@ApiTags('Website')
@Controller('website')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('website')
@ApiBearerAuth()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  private tenantFrom(req: any): TenantContext {
    return { id: req.tenant.id, schemaName: req.tenant.schemaName };
  }

  @Get()
  @RequirePermissions('website.view')
  @ApiOperation({
    summary: "Get the tenant's website settings (auto-created on first read)",
  })
  async getSite(@Req() req: any) {
    const site = await this.websiteService.getOrCreateSite(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.websiteService.publicUrl(site.slug) },
    };
  }

  @Put()
  @RequirePermissions('website.manage')
  @ApiOperation({ summary: 'Update website settings (brand, hero, contact, slug…)' })
  async update(@Req() req: any, @Body() dto: UpdateWebsiteDto) {
    const site = await this.websiteService.updateSite(
      this.tenantFrom(req),
      dto,
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.websiteService.publicUrl(site.slug) },
      message: 'Website updated',
    };
  }

  @Post('publish')
  @RequirePermissions('website.publish')
  @ApiOperation({ summary: 'Publish the website (public URL goes live)' })
  async publish(@Req() req: any) {
    const site = await this.websiteService.publish(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.websiteService.publicUrl(site.slug) },
      message: 'Website published',
    };
  }

  @Post('unpublish')
  @RequirePermissions('website.publish')
  @ApiOperation({ summary: 'Unpublish the website (public URL 404s)' })
  async unpublish(@Req() req: any) {
    const site = await this.websiteService.unpublish(
      this.tenantFrom(req),
      req.businessId,
    );
    return {
      success: true,
      data: { ...site, publicUrl: this.websiteService.publicUrl(site.slug) },
      message: 'Website unpublished',
    };
  }

  @Post('upload-image')
  @RequirePermissions('website.manage')
  @ApiOperation({ summary: 'Upload a website image (logo/hero); returns the stored URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImageDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: UploadedImageFile, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Image must be 5MB or smaller');
    }
    const schema = req.tenant?.schemaName ?? 'public';
    const url = await this.websiteService.uploadImage(
      file.buffer,
      file.mimetype,
      schema,
    );
    return { success: true, data: { url } };
  }
}
