import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AttendanceService } from './attendance.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Attendance')
@Controller('hrms/attendance')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @RequirePermissions('attendance.clock-in')
  @ApiOperation({ summary: 'Clock in' })
  async clockIn(@Request() req, @Body() clockInDto: ClockInDto, @I18n() i18n: I18nContext) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User is not an employee. Please link your account to an employee record.');
    }

    const entry = await this.attendanceService.clockIn(employeeId, clockInDto);
    return {
      success: true,
      data: entry,
      message: i18n.t('common.created'),
    };
  }

  @Post('clock-out')
  @RequirePermissions('attendance.clock-out')
  @ApiOperation({ summary: 'Clock out' })
  async clockOut(@Request() req, @Body() clockOutDto: ClockOutDto, @I18n() i18n: I18nContext) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User is not an employee. Please link your account to an employee record.');
    }

    const entry = await this.attendanceService.clockOut(employeeId, clockOutDto);
    return {
      success: true,
      data: entry,
      message: i18n.t('common.updated'),
    };
  }

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get all attendance records' })
  async getAllAttendance(
    @Request() req,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const entries = await this.attendanceService.getAllTimeEntries(
      req.user.businessId,
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: entries,
    };
  }

  @Get('entries')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get time entries' })
  async getTimeEntries(
    @Request() req,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const empId = employeeId || req.user.employeeId;
    if (!empId) {
      return { success: false, error: 'Employee ID required' };
    }

    const entries = await this.attendanceService.getTimeEntries(
      empId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: entries,
    };
  }

  @Get('timesheets')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get timesheets' })
  async getTimesheets(@Request() req, @Query('employeeId') employeeId?: string) {
    const empId = employeeId || req.user.employeeId;
    if (!empId) {
      return { success: false, error: 'Employee ID required' };
    }

    const timesheets = await this.attendanceService.getTimesheets(empId);
    return {
      success: true,
      data: timesheets,
    };
  }

  @Post('timesheets/:id/approve')
  @RequirePermissions('attendance.approve')
  @ApiOperation({ summary: 'Approve timesheet' })
  async approveTimesheet(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    const timesheet = await this.attendanceService.approveTimesheet(id, req.user.sub);
    return {
      success: true,
      data: timesheet,
      message: i18n.t('common.updated'),
    };
  }
}
