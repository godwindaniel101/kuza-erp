import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Leaves')
@Controller('hrms/leaves')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @RequirePermissions('leaves.create')
  @ApiOperation({ summary: 'Create leave request' })
  async create(@Request() req, @Body() createDto: CreateLeaveRequestDto, @I18n() i18n: I18nContext) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return { success: false, error: 'User is not an employee' };
    }

    const request = await this.leavesService.create(employeeId, createDto);
    return {
      success: true,
      data: request,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('leaves.view')
  @ApiOperation({ summary: 'Get all leave requests' })
  async findAll(@Request() req, @Query('employeeId') employeeId?: string) {
    const empId = employeeId || req.user.employeeId;
    const requests = await this.leavesService.findAll(empId);
    return {
      success: true,
      data: requests,
    };
  }

  @Get(':id')
  @RequirePermissions('leaves.view')
  @ApiOperation({ summary: 'Get leave request by ID' })
  async findOne(@Param('id') id: string) {
    const request = await this.leavesService.findOne(id);
    return {
      success: true,
      data: request,
    };
  }

  @Post(':id/approve')
  @RequirePermissions('leaves.approve')
  @ApiOperation({ summary: 'Approve leave request' })
  async approve(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    const request = await this.leavesService.approve(id, req.user.sub);
    return {
      success: true,
      data: request,
      message: i18n.t('common.updated'),
    };
  }

  @Post(':id/reject')
  @RequirePermissions('leaves.approve')
  @ApiOperation({ summary: 'Reject leave request' })
  async reject(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason: string },
    @I18n() i18n: I18nContext,
  ) {
    const request = await this.leavesService.reject(id, req.user.sub, body.reason);
    return {
      success: true,
      data: request,
      message: i18n.t('common.updated'),
    };
  }
}

