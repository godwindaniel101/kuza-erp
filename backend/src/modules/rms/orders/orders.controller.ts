import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { MarkPaidDto } from "./dto/mark-paid.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BranchScopeService } from "../../../common/branch-scope/branch-scope.service";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("RMS - Orders")
@Controller("rms/orders")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items")
@ApiBearerAuth()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly branchScopeService: BranchScopeService,
  ) {}

  @Post()
  @RequirePermissions("orders.create")
  @ApiOperation({ summary: "Create a new order" })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @I18n() i18n: I18nContext,
    @Request() req: any,
  ) {
    const order = await this.ordersService.create(
      createOrderDto.branchId,
      createOrderDto,
      { id: req.user?.sub, name: req.user?.name },
    );
    return {
      success: true,
      data: order,
      message: i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("orders.view")
  @ApiOperation({ summary: "Get all orders" })
  async findAll(@Request() req: any, @Query("branchId") branchId?: string) {
    // Branch-scoped users only see their branches' orders; an out-of-scope
    // branchId is rejected (403) by resolveBranchFilter.
    const filter = await this.branchScopeService.resolveBranchFilter(req.user, branchId);
    const orders = await this.ordersService.findAll(filter);
    return {
      success: true,
      data: orders,
    };
  }

  @Get(":id")
  @RequirePermissions("orders.view")
  @ApiOperation({ summary: "Get order by ID" })
  async findOne(@Param("id") id: string) {
    const order = await this.ordersService.findOne(id);
    return {
      success: true,
      data: order,
    };
  }

  @Patch(":id")
  @RequirePermissions("orders.edit")
  @ApiOperation({ summary: "Update order" })
  async update(
    @Param("id") id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @I18n() i18n: I18nContext,
  ) {
    const order = await this.ordersService.update(id, updateOrderDto);
    return {
      success: true,
      data: order,
      message: i18n.t("common.updated"),
    };
  }

  @Post(":id/mark-paid")
  @RequirePermissions("orders.edit")
  @ApiOperation({ summary: "Mark order as paid" })
  async markAsPaid(
    @Param("id") id: string,
    @Body() paymentDto: MarkPaidDto,
    @I18n() i18n: I18nContext,
  ) {
    const order = await this.ordersService.markAsPaid(id, paymentDto);
    return {
      success: true,
      data: order,
      message: i18n.t("paymentProcessed") || "Payment processed successfully",
    };
  }

  @Post(":id/fulfil")
  @RequirePermissions("orders.edit")
  @ApiOperation({
    summary: "Fulfil a pending marketplace sale by debiting stock from a chosen branch",
  })
  async fulfil(
    @Param("id") id: string,
    @Body() body: { branchId: string },
    @I18n() i18n: I18nContext,
    @Request() req: any,
  ) {
    const order = await this.ordersService.fulfil(id, body.branchId, {
      id: req.user?.sub,
      name: req.user?.name,
    });
    return {
      success: true,
      data: order,
      message: i18n.t("common.updated"),
    };
  }

  @Get("diagnostic")
  @RequirePermissions("orders.view")
  @ApiOperation({ summary: "Get diagnostic info for debugging orders" })
  async getDiagnosticInfo(@Query('branchId') branchId?: string) {
    const data = await this.ordersService.getDiagnosticInfo(branchId);
    return {
      success: true,
      data
    };
  }

  @Delete(":id")
  @RequirePermissions("orders.delete")
  @ApiOperation({ summary: "Delete order" })
  async remove(@Param("id") id: string, @I18n() i18n: I18nContext) {
    await this.ordersService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }
}
