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
import { LeaveTypesService } from './leave-types.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';

@ApiTags('HRMS - Leave Types')
@Controller('hrms/leave-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Post()
  @RequirePermissions('leaveTypes.create')
  @ApiOperation({ summary: 'Create a new leave type' })
  async create(@Request() req, @Body() createDto: CreateLeaveTypeDto, @I18n() i18n: I18nContext) {
    const leaveType = await this.leaveTypesService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: leaveType,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('leaveTypes.view')
  @ApiOperation({ summary: 'Get all leave types' })
  async findAll(@Request() req) {
    const leaveTypes = await this.leaveTypesService.findAll(req.user.businessId);
    return {
      success: true,
      data: leaveTypes,
    };
  }

  @Get(':id')
  @RequirePermissions('leaveTypes.view')
  @ApiOperation({ summary: 'Get leave type by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const leaveType = await this.leaveTypesService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: leaveType,
    };
  }

  @Patch(':id')
  @RequirePermissions('leaveTypes.edit')
  @ApiOperation({ summary: 'Update leave type' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateLeaveTypeDto,
    @I18n() i18n: I18nContext,
  ) {
    const leaveType = await this.leaveTypesService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: leaveType,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('leaveTypes.delete')
  @ApiOperation({ summary: 'Delete leave type' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.leaveTypesService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

