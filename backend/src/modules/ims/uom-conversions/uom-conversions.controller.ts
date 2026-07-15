import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UomConversionsService } from "./uom-conversions.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("IMS - UOM Conversions")
@Controller("ims/uom-conversions")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items")
@ApiBearerAuth()
export class UomConversionsController {
  constructor(private readonly conversionsService: UomConversionsService) {}

  @Get()
  @RequirePermissions("uoms.view")
  @ApiOperation({ summary: "Get all UOM conversions" })
  async findAll() {
    const conversions = await this.conversionsService.findAll();
    return { success: true, data: conversions };
  }

  @Post()
  @RequirePermissions("uoms.create")
  @ApiOperation({ summary: "Create UOM conversion" })
  async create(
    @Body() body: { fromUomId: string; toUomId: string; factor: number },
  ) {
    const conversion = await this.conversionsService.create(body);
    return {
      success: true,
      data: conversion,
      message: "Conversion created successfully",
    };
  }

  @Delete(":id")
  @RequirePermissions("uoms.delete")
  @ApiOperation({ summary: "Delete UOM conversion" })
  async remove(@Param("id") id: string) {
    await this.conversionsService.remove(id);
    return { success: true, message: "Conversion deleted successfully" };
  }

  @Get("for-uom/:uomId")
  @RequirePermissions("uoms.view")
  @ApiOperation({
    summary: "Get all conversions (direct and indirect) for a specific UOM",
  })
  async getConversionsForUom(@Param("uomId") uomId: string) {
    const conversions =
      await this.conversionsService.getConversionsForUom(uomId);
    return { success: true, data: conversions };
  }
}
