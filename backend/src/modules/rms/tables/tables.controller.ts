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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('RMS - Tables')
@Controller('rms/tables')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @RequirePermissions('tables.create')
  @ApiOperation({ summary: 'Create a table' })
  async create(@Request() req, @Body() createDto: CreateTableDto, @I18n() i18n: I18nContext) {
    const table = await this.tablesService.create(
      req.user.businessId,
      createDto.branchId,
      createDto,
    );
    return {
      success: true,
      data: table,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('tables.view')
  @ApiOperation({ summary: 'Get all tables' })
  async findAll(@Request() req, @Query('branchId') branchId?: string) {
    const tables = await this.tablesService.findAll(req.user.businessId, branchId);
    return {
      success: true,
      data: tables,
    };
  }

  @Get(':id')
  @RequirePermissions('tables.view')
  @ApiOperation({ summary: 'Get table by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const table = await this.tablesService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: table,
    };
  }

  @Patch(':id')
  @RequirePermissions('tables.edit')
  @ApiOperation({ summary: 'Update table' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateTableDto,
    @I18n() i18n: I18nContext,
  ) {
    const table = await this.tablesService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: table,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('tables.delete')
  @ApiOperation({ summary: 'Delete table' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.tablesService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

