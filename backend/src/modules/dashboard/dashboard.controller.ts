import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    const businessId = req.user?.businessId;
    
    if (!businessId) {
      return {
        success: false,
        message: 'Restaurant not found',
        data: {
          todaySales: 0,
          activeOrders: 0,
          lowStockCount: 0,
          occupancyRate: 0,
        },
      };
    }

    const stats = await this.dashboardService.getStats(businessId);

    return {
      success: true,
      data: stats,
    };
  }
}

