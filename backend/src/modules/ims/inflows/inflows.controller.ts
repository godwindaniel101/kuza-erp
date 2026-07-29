import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { InflowsService } from "./inflows.service";
import { CreateInventoryInflowDto } from "./dto/create-inventory-inflow.dto";
import { UpdateInventoryInflowDto } from "./dto/update-inventory-inflow.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BranchScopeService } from "../../../common/branch-scope/branch-scope.service";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("IMS - Inventory Inflows")
@Controller("ims/inflows")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items", "rms")
@ApiBearerAuth()
export class InflowsController {
  constructor(
    private readonly inflowsService: InflowsService,
    private readonly branchScopeService: BranchScopeService,
  ) {}

  @Post()
  @RequirePermissions("inflows.create")
  @ApiOperation({ summary: "Create inventory inflow" })
  async create(
    @Request() req,
    @Body() createDto: CreateInventoryInflowDto,
    @I18n() i18n: I18nContext,
  ) {
    const inflow = await this.inflowsService.create(createDto, req.user?.sub);
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
    @Query("batchId") batchId?: string,
  ) {
    // Branch-scoped users only see their branches' inflows; an out-of-scope
    // branchId is rejected (403) by resolveBranchFilter.
    const filter = await this.branchScopeService.resolveBranchFilter(
      req.user,
      branchId,
    );
    const inflows = await this.inflowsService.findAll(filter, batchId);
    return {
      success: true,
      data: inflows,
    };
  }

  @Get("batch/:batchId")
  @RequirePermissions("inflows.view")
  @ApiOperation({ summary: "Get a purchase/batch summary by batch ID" })
  async getBatchSummary(@Param("batchId") batchId: string) {
    const summary = await this.inflowsService.getBatchSummary(batchId);
    return {
      success: true,
      data: summary,
    };
  }

  @Get(":id")
  @RequirePermissions("inflows.view")
  @ApiOperation({ summary: "Get inventory inflow by ID" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withSales") withSales?: string,
  ) {
    if (withSales === "true") {
      const inflow = await this.inflowsService.findOneWithSalesData(id);
      return {
        success: true,
        data: inflow,
      };
    }

    const inflow = await this.inflowsService.findOne(id);
    return {
      success: true,
      data: inflow,
    };
  }

  @Patch(":id")
  @RequirePermissions("inflows.edit")
  @ApiOperation({ summary: "Update inventory inflow" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInventoryInflowDto,
    @I18n() i18n: I18nContext,
  ) {
    const inflow = await this.inflowsService.update(
      id,

      updateDto,
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
    @I18n() i18n: I18nContext,
  ) {
    const inflow = await this.inflowsService.approve(
      id,

      req.user.sub,
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
    @Param("id", ParseUUIDPipe) id: string,
    @I18n() i18n: I18nContext,
  ) {
    await this.inflowsService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }

  @Post("bulk-upload")
  @RequirePermissions("inflows.create")
  @ApiOperation({ summary: "Bulk upload inventory items from CSV" })
  async bulkUpload(
    @Body() body: { csv: string },
    @I18n() i18n: I18nContext,
  ) {
    const results = await this.inflowsService.bulkUpload(body.csv);

    // Return enhanced response with detailed error information
    return {
      success: results.success > 0,
      data: {
        summary: results.summary,
        errors: results.errors || [],
        failedUploads: results.failedUploads || [],
        // Backward compatibility: map failedUploads to detailedErrors format for existing frontend
        detailedErrors: (results.failedUploads || []).map(failed => ({
          line: failed.lineNumber,
          data: Object.values(failed.rowData).join(','),
          errors: failed.errors
        }))
      },
      message: results.success > 0 
        ? i18n.t("common.uploaded") 
        : i18n.t("common.uploadFailed", { args: { count: results.failedUploads?.length || 0 } })
    };
  }
}
