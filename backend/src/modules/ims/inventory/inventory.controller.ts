import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('IMS - Inventory')
@Controller('ims/inventory')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create inventory item' })
  async create(@Request() req, @Body() createDto: CreateInventoryItemDto, @I18n() i18n: I18nContext) {
    const item = await this.inventoryService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: item,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get all inventory items' })
  async findAll(@Request() req, @Query('branchId') branchId?: string, @Query('forOrders') forOrders?: string, @Query('withBranchStock') withBranchStock?: string) {
    if (forOrders === 'true') {
      const items = await this.inventoryService.findForOrders(req.user.businessId, branchId);
      return {
        success: true,
        data: items,
      };
    }
    if (withBranchStock === 'true') {
      const items = await this.inventoryService.findAllWithBranchStock(req.user.businessId);
      return {
        success: true,
        data: items,
      };
    }
    const items = await this.inventoryService.findAll(req.user.businessId, branchId);
    return {
      success: true,
      data: items,
    };
  }

  @Get('low-stock')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get low stock items' })
  async getLowStock(@Request() req, @Query('branchId') branchId?: string) {
    const items = await this.inventoryService.getLowStockItems(
      req.user.businessId,
      branchId,
    );
    return {
      success: true,
      data: items,
    };
  }

  @Get('template')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Download inventory template CSV' })
  async downloadTemplate(@Request() req, @I18n() i18n: I18nContext) {
    const csv = await this.inventoryService.generateTemplate();
    return {
      success: true,
      data: { csv },
    };
  }

  @Get(':id')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Query('stats') stats?: string) {
    if (stats === 'true') {
      const itemStats = await this.inventoryService.getItemStats(id, req.user.businessId);
      return {
        success: true,
        data: itemStats,
      };
    }
    const item = await this.inventoryService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: item,
    };
  }

  @Patch(':id')
  @RequirePermissions('inventory.edit')
  @ApiOperation({ summary: 'Update inventory item' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInventoryItemDto,
    @I18n() i18n: I18nContext,
  ) {
    const item = await this.inventoryService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: item,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('inventory.delete')
  @ApiOperation({ summary: 'Delete inventory item' })
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string, @I18n() i18n: I18nContext) {
    await this.inventoryService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  @Post('bulk-upload')
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Bulk upload inventory items from CSV' })
  async bulkUpload(@Request() req, @Body() body: { csv: string }, @I18n() i18n: I18nContext) {
    const results = await this.inventoryService.bulkUpload(req.user.businessId, body.csv);
    return {
      success: true,
      data: results,
      message: i18n.t('common.uploaded'),
    };
  }
}
