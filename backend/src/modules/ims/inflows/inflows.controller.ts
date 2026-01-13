import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { InflowsService, BulkUploadResult } from "./inflows.service";
import { CreateInventoryInflowDto } from "./dto/create-inventory-inflow.dto";
import { UpdateInventoryInflowDto } from "./dto/update-inventory-inflow.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("IMS - Inventory Inflows")
@Controller("ims/inflows")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InflowsController {
  constructor(private readonly inflowsService: InflowsService) {}

  @Post()
  @RequirePermissions("inflows.create")
  @ApiOperation({ summary: "Create inventory inflow" })
  async create(
    @Request() req,
    @Body() createDto: CreateInventoryInflowDto,
    @I18n() i18n: I18nContext
  ) {
    const inflow = await this.inflowsService.create(
      req.user.businessId,
      createDto
    );
    return {
      success: true,
      data: inflow,
      message: i18n.t("common.created"),
    };
  }

  @Get("template")
  @RequirePermissions("inflows.view")
  @ApiOperation({ summary: "Download inflows template CSV" })
  async downloadTemplate(@Request() req, @I18n() i18n: I18nContext) {
    const csv = await this.inflowsService.generateTemplate();
    return {
      success: true,
      data: { csv },
    };
  }

  @Get()
  @RequirePermissions("inflows.view")
  @ApiOperation({ summary: "Get all inventory inflows" })
  async findAll(
    @Request() req,
    @Query("branchId") branchId?: string,
    @Query("batchId") batchId?: string
  ) {
    const inflows = await this.inflowsService.findAll(
      req.user.businessId,
      branchId,
      batchId
    );
    return {
      success: true,
      data: inflows,
    };
  }

  @Get(":id")
  @RequirePermissions("inflows.view")
  @ApiOperation({ summary: "Get inventory inflow by ID" })
  async findOne(
    @Request() req,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withSales") withSales?: string
  ) {
    if (withSales === "true") {
      const inflow = await this.inflowsService.findOneWithSalesData(
        id,
        req.user.businessId
      );
      return {
        success: true,
        data: inflow,
      };
    }

    const inflow = await this.inflowsService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: inflow,
    };
  }

  @Patch(":id")
  @RequirePermissions("inflows.edit")
  @ApiOperation({ summary: "Update inventory inflow" })
  async update(
    @Request() req,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInventoryInflowDto,
    @I18n() i18n: I18nContext
  ) {
    const inflow = await this.inflowsService.update(
      id,
      req.user.businessId,
      updateDto
    );
    return {
      success: true,
      data: inflow,
      message: i18n.t("common.updated"),
    };
  }

  @Post(":id/approve")
  @RequirePermissions("inflows.approve")
  @ApiOperation({ summary: "Approve inventory inflow" })
  async approve(
    @Request() req,
    @Param("id", ParseUUIDPipe) id: string,
    @I18n() i18n: I18nContext
  ) {
    const inflow = await this.inflowsService.approve(
      id,
      req.user.businessId,
      req.user.sub
    );
    return {
      success: true,
      data: inflow,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("inflows.delete")
  @ApiOperation({ summary: "Delete inventory inflow" })
  async remove(
    @Request() req,
    @Param("id", ParseUUIDPipe) id: string,
    @I18n() i18n: I18nContext
  ) {
    await this.inflowsService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }

  @Post("bulk-upload")
  @RequirePermissions("inflows.create")
  @ApiOperation({ summary: "Bulk upload inventory items from CSV" })
  async bulkUpload(
    @Request() req,
    @Body() body: { csv: string },
    @I18n() i18n: I18nContext
  ) {
    console.log(`[CONTROLLER] Inflow bulk upload started for business: ${req.user.businessId}`);
    console.log(`[CONTROLLER] CSV length: ${body.csv?.length || 0}`);
    
    const results = await this.inflowsService.bulkUpload(
      req.user.businessId,
      body.csv
    );
    
    console.log(`[CONTROLLER] Inflow bulk upload results:`, results);
    
    return {
      success: true,
      data: results,
      message: i18n.t("common.uploaded"),
    };
  }
}
