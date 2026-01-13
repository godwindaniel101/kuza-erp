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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';

@ApiTags('HRMS - Departments')
@Controller('hrms/departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('departments.create')
  @ApiOperation({ summary: 'Create a new department' })
  async create(@Request() req, @Body() createDto: CreateDepartmentDto, @I18n() i18n: I18nContext) {
    const department = await this.departmentsService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: department,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('departments.view')
  @ApiOperation({ summary: 'Get all departments' })
  async findAll(@Request() req) {
    const departments = await this.departmentsService.findAll(req.user.businessId);
    return {
      success: true,
      data: departments,
    };
  }

  @Get(':id')
  @RequirePermissions('departments.view')
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const department = await this.departmentsService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: department,
    };
  }

  @Patch(':id')
  @RequirePermissions('departments.edit')
  @ApiOperation({ summary: 'Update department' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateDepartmentDto,
    @I18n() i18n: I18nContext,
  ) {
    const department = await this.departmentsService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: department,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('departments.delete')
  @ApiOperation({ summary: 'Delete department' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.departmentsService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

