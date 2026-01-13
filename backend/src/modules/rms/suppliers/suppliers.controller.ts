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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('RMS - Suppliers')
@Controller('rms/suppliers')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermissions('suppliers.create')
  @ApiOperation({ summary: 'Create a supplier' })
  async create(@Request() req, @Body() createDto: CreateSupplierDto, @I18n() i18n: I18nContext) {
    const supplier = await this.suppliersService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: supplier,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('suppliers.view')
  @ApiOperation({ summary: 'Get all suppliers' })
  async findAll(@Request() req) {
    const suppliers = await this.suppliersService.findAll(req.user.businessId);
    return {
      success: true,
      data: suppliers,
    };
  }

  @Get(':id')
  @RequirePermissions('suppliers.view')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const supplier = await this.suppliersService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: supplier,
    };
  }

  @Patch(':id')
  @RequirePermissions('suppliers.edit')
  @ApiOperation({ summary: 'Update supplier' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSupplierDto,
    @I18n() i18n: I18nContext,
  ) {
    const supplier = await this.suppliersService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: supplier,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('suppliers.delete')
  @ApiOperation({ summary: 'Delete supplier' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.suppliersService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

