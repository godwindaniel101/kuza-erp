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
import { UomsService } from './uoms.service';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('IMS - Units of Measure')
@Controller('ims/uoms')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UomsController {
  constructor(private readonly uomsService: UomsService) {}

  @Post()
  @RequirePermissions('uoms.create')
  @ApiOperation({ summary: 'Create UOM' })
  async create(@Request() req, @Body() createDto: CreateUomDto, @I18n() i18n: I18nContext) {
    const uom = await this.uomsService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: uom,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('uoms.view')
  @ApiOperation({ summary: 'Get all UOMs' })
  async findAll(@Request() req) {
    const uoms = await this.uomsService.findAll(req.user.businessId);
    return {
      success: true,
      data: uoms,
    };
  }

  @Get(':id')
  @RequirePermissions('uoms.view')
  @ApiOperation({ summary: 'Get UOM by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const uom = await this.uomsService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: uom,
    };
  }

  @Patch(':id')
  @RequirePermissions('uoms.edit')
  @ApiOperation({ summary: 'Update UOM' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateUomDto,
    @I18n() i18n: I18nContext,
  ) {
    const uom = await this.uomsService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: uom,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('uoms.delete')
  @ApiOperation({ summary: 'Delete UOM' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.uomsService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  @Get(':id/convertible')
  @RequirePermissions('uoms.view')
  @ApiOperation({ summary: 'Get all UOMs convertible from/to the given UOM' })
  async getConvertibleUoms(@Request() req, @Param('id') id: string) {
    const result = await this.uomsService.getConvertibleUoms(id, req.user.businessId);
    return {
      success: true,
      data: result,
    };
  }
}

