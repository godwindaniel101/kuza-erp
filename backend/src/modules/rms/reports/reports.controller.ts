import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { ReportsService } from "./reports.service";
import { I18nContext, I18n } from "nestjs-i18n";

@ApiTags("RMS - Reports & Analytics")
@Controller("rms/reports")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("pos")
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("analytics")
  @RequirePermissions("reports.view")
  @ApiOperation({ summary: "Get analytics data" })
  async getAnalytics(
    @I18n() i18n: I18nContext,
    @Query("period") period?: string,
  ) {
    const analytics = await this.reportsService.getAnalytics(period);
    return {
      success: true,
      data: analytics,
    };
  }
}
