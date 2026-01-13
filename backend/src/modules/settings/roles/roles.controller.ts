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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('Settings - Roles')
@Controller('roles')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create role' })
  async create(@Request() req, @Body() createDto: CreateRoleDto, @I18n() i18n: I18nContext) {
    const role = await this.rolesService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: role,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'Get all roles' })
  async findAll(@Request() req) {
    const roles = await this.rolesService.findAll(req.user.businessId);
    return {
      success: true,
      data: roles,
    };
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const role = await this.rolesService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: role,
    };
  }

  @Patch(':id')
  @RequirePermissions('roles.edit')
  @ApiOperation({ summary: 'Update role' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateRoleDto,
    @I18n() i18n: I18nContext,
  ) {
    const role = await this.rolesService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: role,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Delete role' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.rolesService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

