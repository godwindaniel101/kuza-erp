import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { AskCopilotDto } from './dto/ask-copilot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';
import { FeatureGateGuard, RequireApp } from '../billing/guards/feature-gate.guard';

@ApiTags('Insights')
@Controller('insights')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp('insights')
@ApiBearerAuth()
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('digest')
  @RequirePermissions('accounting.view')
  @ApiOperation({
    summary:
      'Plain-language business digest: cash, profit, debtors, low stock, sales trend, overdue',
  })
  async getDigest() {
    const data = await this.insightsService.getDigest();
    return { success: true, data };
  }

  @Post('ask')
  @RequirePermissions('accounting.view')
  @ApiOperation({
    summary:
      'Kuza Copilot: ask a plain-language question about your business data',
  })
  async ask(@Body() dto: AskCopilotDto) {
    const data = await this.insightsService.ask(dto.question);
    return { success: true, data };
  }
}
