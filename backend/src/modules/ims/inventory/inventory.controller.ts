import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { InventoryService } from "./inventory.service";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("IMS - Inventory")
@Controller("ims/inventory")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items", "rms")
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RequirePermissions("inventory.create")
  @ApiOperation({ summary: "Create inventory item" })
  async create(
    @Body() createDto: CreateInventoryItemDto,
    @I18n() i18n: I18nContext,
    @Request() req: any,
  ) {
    const item = await this.inventoryService.create(createDto, {
      id: req.user?.sub,
      name: req.user?.name,
    });
    return {
      success: true,
      data: item,
      message: i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get all inventory items" })
  async findAll(
    @Query("branchId") branchId?: string,
    @Query("forOrders") forOrders?: string,
    @Query("withBranchStock") withBranchStock?: string,
  ) {
    if (forOrders === "true") {
      const items = await this.inventoryService.findForOrders(branchId);
      return {
        success: true,
        data: items,
      };
    }
    if (withBranchStock === "true") {
      const items = await this.inventoryService.findAllWithBranchStock();
      return {
        success: true,
        data: items,
      };
    }
    const items = await this.inventoryService.findAll(branchId);
    return {
      success: true,
      data: items,
    };
  }

  @Get("ingredient-options")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Items as recipe ingredients (UoMs + cost per base unit)" })
  async ingredientOptions() {
    return {
      success: true,
      data: await this.inventoryService.getIngredientOptions(),
    };
  }

  @Get("low-stock")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get low stock items" })
  async getLowStock(@Query("branchId") branchId?: string) {
    const items = await this.inventoryService.getLowStockItems(branchId);
    return {
      success: true,
      data: items,
    };
  }

  @Get("template")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Download inventory template CSV" })
  async downloadTemplate(@I18n() i18n: I18nContext) {
    const csv = await this.inventoryService.generateTemplate();
    return {
      success: true,
      data: { csv },
    };
  }

  @Get("expiring")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get inflow batches expiring soon (branch stock)" })
  async getExpiring(
    @Query("branchId") branchId?: string,
    @Query("days") days?: string,
  ) {
    const rows = await this.inventoryService.findExpiringSoon(
      branchId,
      days ? Number(days) : 30,
    );
    return {
      success: true,
      data: rows,
    };
  }

  @Patch("branch-stock")
  @RequirePermissions("inventory.edit")
  @ApiOperation({ summary: "Update per-branch min/max stock config" })
  async updateBranchStock(
    @Body()
    body: {
      branchId: string;
      inventoryItemId: string;
      minimumStock?: number;
      maximumStock?: number;
    },
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.inventoryService.updateBranchStockConfig(
      body.branchId,
      body.inventoryItemId,
      { minimumStock: body.minimumStock, maximumStock: body.maximumStock },
    );
    return {
      success: true,
      data,
      message: i18n.t("common.updated"),
    };
  }

  @Get(":id")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get inventory item by ID" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("stats") stats?: string,
  ) {
    if (stats === "true") {
      const itemStats = await this.inventoryService.getItemStats(id);
      return {
        success: true,
        data: itemStats,
      };
    }
    const item = await this.inventoryService.findOne(id);
    return {
      success: true,
      data: item,
    };
  }

  @Patch(":id")
  @RequirePermissions("inventory.edit")
  @ApiOperation({ summary: "Update inventory item" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInventoryItemDto,
    @I18n() i18n: I18nContext,
    @Request() req: any,
  ) {
    const item = await this.inventoryService.update(id, updateDto, {
      id: req.user?.sub,
      name: req.user?.name,
    });
    return {
      success: true,
      data: item,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("inventory.delete")
  @ApiOperation({ summary: "Delete inventory item" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @I18n() i18n: I18nContext,
  ) {
    await this.inventoryService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }

  @Post("bulk-upload")
  @RequirePermissions("inventory.create")
  @ApiOperation({ summary: "Bulk upload inventory items from CSV" })
  async bulkUpload(@Body() body: { csv: string }, @I18n() i18n: I18nContext) {
    const results = await this.inventoryService.bulkUpload(body.csv);

    // Return enhanced response with detailed error information
    return {
      success: results.success > 0,
      data: {
        summary: results.summary || {
          total: 0,
          processed: 0,
          successful: results.success,
          failed: results.errors?.length || 0,
          skipped: results.skipped
        },
        errors: results.errors || [],
        failedUploads: results.detailedErrors || [] // Map detailedErrors to failedUploads for consistency
      },
      message: results.success > 0 
        ? i18n.t("common.uploaded") 
        : i18n.t("common.uploadFailed", { args: { count: results.errors?.length || 0 } })
    };
  }
}
