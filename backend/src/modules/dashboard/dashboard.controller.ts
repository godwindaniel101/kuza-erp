import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BranchScopeService } from '../../common/branch-scope/branch-scope.service';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly branchScopeService: BranchScopeService,
  ) {}

  @Get('stats')
  async getStats(@Request() req: any, @Query('period') period?: string) {
    // A branch-scoped user's dashboard must only reflect their allowed
    // branches; unscoped users get `null` (all branches).
    const branchIds = await this.branchScopeService.allowedBranchIds(req.user);
    const stats = await this.dashboardService.getStats(period, branchIds);

    return {
      success: true,
      data: stats,
    };
  }
}

