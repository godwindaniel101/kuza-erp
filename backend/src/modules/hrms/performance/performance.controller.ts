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
import { PerformanceService } from './performance.service';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { UpdatePerformanceReviewDto } from './dto/update-performance-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Performance')
@Controller('hrms/performance')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post('reviews')
  @RequirePermissions('performance.create')
  @ApiOperation({ summary: 'Create performance review' })
  async create(@Request() req, @Body() createDto: CreatePerformanceReviewDto, @I18n() i18n: I18nContext) {
    const review = await this.performanceService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: review,
      message: i18n.t('common.created'),
    };
  }

  @Get('reviews')
  @RequirePermissions('performance.view')
  @ApiOperation({ summary: 'Get all performance reviews' })
  async findAll(@Request() req, @Query('employeeId') employeeId?: string) {
    const reviews = await this.performanceService.findAll(req.user.businessId, employeeId);
    return {
      success: true,
      data: reviews,
    };
  }

  @Get('reviews/:id')
  @RequirePermissions('performance.view')
  @ApiOperation({ summary: 'Get performance review by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const review = await this.performanceService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: review,
    };
  }

  @Patch('reviews/:id')
  @RequirePermissions('performance.edit')
  @ApiOperation({ summary: 'Update performance review' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdatePerformanceReviewDto,
    @I18n() i18n: I18nContext,
  ) {
    const review = await this.performanceService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: review,
      message: i18n.t('common.updated'),
    };
  }

  @Post('reviews/:id/complete')
  @RequirePermissions('performance.edit')
  @ApiOperation({ summary: 'Complete performance review' })
  async complete(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    const review = await this.performanceService.complete(id, req.user.businessId);
    return {
      success: true,
      data: review,
      message: i18n.t('common.updated'),
    };
  }

  @Delete('reviews/:id')
  @RequirePermissions('performance.delete')
  @ApiOperation({ summary: 'Delete performance review' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.performanceService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

