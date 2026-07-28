import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";

@ApiTags("IMS - AI Analytics")
@Controller("ims/ai")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items", "rms")
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("predict-demand/:itemId")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Predict demand for inventory item" })
  async predictDemand(
    @Param("itemId") itemId: string,
    @Query("days") days?: string,
  ) {
    const prediction = await this.aiService.predictDemand(
      itemId,
      days ? parseInt(days) : 30,
    );
    return {
      success: true,
      data: prediction,
    };
  }

  @Get("reorder-suggestions")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get AI-powered reorder suggestions" })
  async getReorderSuggestions(@Request() req) {
    const suggestions = await this.aiService.generateReorderSuggestions();
    return {
      success: true,
      data: suggestions,
    };
  }

  @Get("inventory-health")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Analyze overall inventory health" })
  async analyzeInventoryHealth(@Request() req) {
    const health = await this.aiService.analyzeInventoryHealth();
    return {
      success: true,
      data: health,
    };
  }

  @Get("forecast-sales/:itemId")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Forecast sales for inventory item" })
  async forecastSales(
    @Param("itemId") itemId: string,
    @Query("period") period: "week" | "month" | "quarter" = "month",
  ) {
    const forecast = await this.aiService.forecastSales(itemId, period);
    return {
      success: true,
      data: forecast,
    };
  }
}
