import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { AskCopilotDto } from './dto/ask-copilot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';

@ApiTags('Insights')
@Controller('insights')
// AI insights are available by default — no @RequireApp gate. Access is still
// scoped per-endpoint by role permissions (e.g. accounting.view).
@UseGuards(JwtAuthGuard, PermissionsGuard)
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

  // Alias consumed by the frontend Kuza AI copilot panel (POST /insights/copilot).
  @Post('copilot')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Kuza Copilot (alias of /ask)' })
  async copilot(@Body() dto: AskCopilotDto) {
    const data = await this.insightsService.ask(dto.question);
    return { success: true, data };
  }

  // Dashboard AI-insights cards (GET /insights/summary).
  @Get('summary')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Plain-language AI insight cards for the dashboard' })
  async getSummary() {
    const data = await this.insightsService.getSummary();
    return { success: true, data };
  }
}
