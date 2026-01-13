import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { I18nContext, I18n } from 'nestjs-i18n';

@ApiTags('RMS - Reports & Analytics')
@Controller('rms/reports')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get analytics data' })
  async getAnalytics(@Request() req, @I18n() i18n: I18nContext) {
    const analytics = await this.reportsService.getAnalytics(req.user.businessId);
    return {
      success: true,
      data: analytics,
    };
  }
}

