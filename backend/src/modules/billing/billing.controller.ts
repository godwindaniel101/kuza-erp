import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available plans' })
  async getPlans() {
    const plans = await this.billingService.getPlans();
    return { success: true, data: plans };
  }

  @Get('subscription')
  @ApiOperation({ summary: "Get the current tenant's subscription and plan" })
  async getSubscription(@Request() req: any) {
    const subscription = await this.billingService.withLocalPrice(
      await this.billingService.getOrCreateSubscription(req.user.tenantId),
    );
    return { success: true, data: subscription };
  }

  @Post('subscription/change')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: "Change the current tenant's plan" })
  async changePlan(@Request() req: any, @Body() dto: ChangePlanDto) {
    const subscription = await this.billingService.withLocalPrice(
      await this.billingService.changePlan(req.user.tenantId, dto.planCode),
    );
    return { success: true, data: subscription };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Current usage vs plan limits' })
  async getUsage(@Request() req: any) {
    const data = await this.billingService.getUsage(req.user.tenantId);
    return { success: true, data };
  }

  @Get('apps')
  @ApiOperation({
    summary: 'App registry with per-app state and the effective app list',
  })
  async getApps(@Request() req: any) {
    const data = await this.billingService.getAppsOverview(
      req.user.tenantId,
      req.tenant.schemaName,
    );
    return { success: true, data };
  }

  @Patch('apps')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Enable or disable an app for this business' })
  async updateApp(@Request() req: any, @Body() dto: UpdateAppDto) {
    const data = await this.billingService.setAppEnabled(
      req.user.tenantId,
      req.tenant.schemaName,
      dto.key,
      dto.enabled,
    );
    return { success: true, data };
  }
}
