import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { TransfersService } from './transfers.service';
import { CreateInventoryTransferDto, UpdateTransferStatusDto, ReceiveTransferItemDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('IMS - Inventory Transfers')
@Controller('ims/transfers')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create inventory transfer' })
  async create(@Request() req, @Body() createDto: CreateInventoryTransferDto, @I18n() i18n: I18nContext) {
    const transfer = await this.transfersService.create(req.user.businessId, req.user.sub, createDto);
    return {
      success: true,
      data: transfer,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get all inventory transfers' })
  async findAll(@Request() req, @Query('branchId') branchId?: string) {
    const transfers = await this.transfersService.findAll(req.user.businessId, branchId);
    return {
      success: true,
      data: transfers,
    };
  }

  @Get(':id')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get inventory transfer by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const transfer = await this.transfersService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: transfer,
    };
  }

  @Post(':id/status')
  @RequirePermissions('inventory.edit')
  @ApiOperation({ summary: 'Update transfer status' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateTransferStatusDto,
    @I18n() i18n: I18nContext,
  ) {
    const transfer = await this.transfersService.updateStatus(
      id,
      req.user.businessId,
      req.user.sub,
      updateDto,
    );
    return {
      success: true,
      data: transfer,
      message: i18n.t('common.updated'),
    };
  }

  @Post(':id/receive')
  @RequirePermissions('inventory.edit')
  @ApiOperation({ summary: 'Receive transfer items' })
  async receiveItems(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { items: ReceiveTransferItemDto[] },
    @I18n() i18n: I18nContext,
  ) {
    const transfer = await this.transfersService.receiveItems(
      id,
      req.user.businessId,
      req.user.sub,
      body.items,
    );
    return {
      success: true,
      data: transfer,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('inventory.delete')
  @ApiOperation({ summary: 'Delete inventory transfer' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.transfersService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

