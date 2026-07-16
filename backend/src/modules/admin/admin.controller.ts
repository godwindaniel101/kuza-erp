import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminService } from './admin.service';
import { SetTenantAppDto } from './dto/set-tenant-app.dto';
import { ChangeTenantPlanDto } from './dto/change-tenant-plan.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AccessRequestStatus } from '../billing/entities/app-access-request.entity';

/**
 * Platform super-admin back-office.
 *
 * SECURITY: every route is gated by JwtAuthGuard + SuperAdminGuard at the
 * class level. SuperAdminGuard requires the signed `isSuperAdmin` JWT claim, so
 * access is enforced entirely server-side — the frontend never decides who may
 * call these endpoints. The global TenantGuard/PermissionsGuard still run; this
 * boundary is additive and does not weaken tenant isolation.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with plan/subscription summary' })
  async listTenants() {
    const data = await this.adminService.listTenants();
    return { success: true, data };
  }

  @Get('tenants/:tenantId')
  @ApiOperation({ summary: 'Tenant detail: apps, plan, pending requests' })
  async getTenant(@Param('tenantId') tenantId: string) {
    const data = await this.adminService.getTenantDetail(tenantId);
    return { success: true, data };
  }

  @Post('tenants/:tenantId/apps')
  @ApiOperation({ summary: 'Enable or disable an app for a tenant' })
  async setTenantApp(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetTenantAppDto,
  ) {
    const data = await this.adminService.setTenantApp(
      tenantId,
      dto.appKey,
      dto.enabled,
    );
    return { success: true, data };
  }

  @Post('tenants/:tenantId/plan')
  @ApiOperation({ summary: "Change a tenant's plan" })
  async changeTenantPlan(
    @Param('tenantId') tenantId: string,
    @Body() dto: ChangeTenantPlanDto,
  ) {
    const data = await this.adminService.changeTenantPlan(
      tenantId,
      dto.planCode,
    );
    return { success: true, data };
  }

  @Get('access-requests')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @ApiOperation({ summary: 'List app access requests across all tenants' })
  async listAccessRequests(@Query('status') status?: AccessRequestStatus) {
    const data = await this.adminService.listAccessRequests(status);
    return { success: true, data };
  }

  @Post('access-requests/:id/approve')
  @ApiOperation({
    summary: 'Approve an access request (cross-tenant) and enable the app',
  })
  async approveAccessRequest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const data = await this.adminService.approveAccessRequest(id, req.user);
    return { success: true, data };
  }

  @Post('access-requests/:id/reject')
  @ApiOperation({ summary: 'Reject an access request (cross-tenant)' })
  async rejectAccessRequest(@Request() req: any, @Param('id') id: string) {
    const data = await this.adminService.rejectAccessRequest(id, req.user);
    return { success: true, data };
  }

  @Get('plans')
  @ApiOperation({ summary: 'Plan catalog (read-only)' })
  async listPlans() {
    const data = await this.adminService.listPlans();
    return { success: true, data };
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new plan' })
  async createPlan(@Body() dto: CreatePlanDto) {
    const data = await this.adminService.createPlan(dto);
    return { success: true, data };
  }

  @Patch('plans/:code')
  @ApiOperation({ summary: 'Update a plan (name, price, limits.modules, active)' })
  async updatePlan(@Param('code') code: string, @Body() dto: UpdatePlanDto) {
    const data = await this.adminService.updatePlan(code, dto);
    return { success: true, data };
  }

  @Delete('plans/:code')
  @ApiOperation({
    summary: 'Deactivate (soft-delete) a plan — never breaks existing tenants',
  })
  async deactivatePlan(@Param('code') code: string) {
    const data = await this.adminService.deactivatePlan(code);
    return { success: true, data };
  }
}
