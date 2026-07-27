import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NetworkCatalogService } from './network-catalog.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/catalog-item.dto';

/**
 * Kuza Network marketplace catalog (Phase 2). JWT-only; the service scopes
 * every operation to the caller's tenant and enforces listing ownership +
 * cross-tenant browse visibility.
 */
@ApiTags('Network')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network/catalog')
export class NetworkCatalogController {
  constructor(private readonly catalogService: NetworkCatalogService) {}

  @Get()
  async listMine(@Req() req: any) {
    const data = await this.catalogService.listMine(req.user.tenantId);
    return { success: true, data };
  }

  @Get('browse')
  async browse(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('supplierTenantId') supplierTenantId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { items, total, hasMore } = await this.catalogService.browse(req.user.tenantId, {
      search,
      supplierTenantId,
      limit: limit != null ? Number(limit) : undefined,
      offset: offset != null ? Number(offset) : undefined,
    });
    // `data` stays the items array (back-compat); pagination rides alongside.
    return { success: true, data: items, total, hasMore };
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCatalogItemDto) {
    const data = await this.catalogService.create(req.user.tenantId, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    const data = await this.catalogService.update(req.user.tenantId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const data = await this.catalogService.remove(req.user.tenantId, id);
    return { success: true, data };
  }
}
