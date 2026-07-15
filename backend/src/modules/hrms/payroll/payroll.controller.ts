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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { PayrollService } from "./payroll.service";
import { CreatePayrollDto } from "./dto/create-payroll.dto";
import { UpdatePayrollDto } from "./dto/update-payroll.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("HRMS - Payroll")
@Controller("hrms/payroll")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("payroll")
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @RequirePermissions("payroll.create")
  @ApiOperation({ summary: "Create payroll" })
  async create(@Body() createDto: CreatePayrollDto, @I18n() i18n: I18nContext) {
    const payroll = await this.payrollService.create(createDto);
    return {
      success: true,
      data: payroll,
      message: i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("payroll.view")
  @ApiOperation({ summary: "Get all payrolls" })
  async findAll(@Query("employeeId") employeeId?: string) {
    const payrolls = await this.payrollService.findAll(employeeId);
    return {
      success: true,
      data: payrolls,
    };
  }

  @Get(":id")
  @RequirePermissions("payroll.view")
  @ApiOperation({ summary: "Get payroll by ID" })
  async findOne(@Param("id") id: string) {
    const payroll = await this.payrollService.findOne(id);
    return {
      success: true,
      data: payroll,
    };
  }

  @Patch(":id")
  @RequirePermissions("payroll.edit")
  @ApiOperation({ summary: "Update payroll" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdatePayrollDto,
    @I18n() i18n: I18nContext,
  ) {
    const payroll = await this.payrollService.update(id, updateDto);
    return {
      success: true,
      data: payroll,
      message: i18n.t("common.updated"),
    };
  }

  @Post(":id/approve")
  @RequirePermissions("payroll.approve")
  @ApiOperation({ summary: "Approve payroll" })
  async approve(
    @Request() req,
    @Param("id") id: string,
    @I18n() i18n: I18nContext,
  ) {
    const payroll = await this.payrollService.approve(id, req.user.sub);
    return {
      success: true,
      data: payroll,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("payroll.delete")
  @ApiOperation({ summary: "Delete payroll" })
  async remove(@Param("id") id: string, @I18n() i18n: I18nContext) {
    await this.payrollService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }

  @Post(":id/process-payment")
  @RequirePermissions("payroll.process")
  @ApiOperation({ summary: "Process payroll payment" })
  async processPayment(@Param("id") id: string, @I18n() i18n: I18nContext) {
    const result = await this.payrollService.processPayment(id);
    return {
      success: true,
      data: result,
      message: i18n.t("paymentProcessed") || "Payment processed successfully",
    };
  }

  @Get(":id/pay-stub")
  @RequirePermissions("payroll.view")
  @ApiOperation({ summary: "Generate pay stub PDF" })
  async generatePayStub(@Param("id") id: string) {
    const payStub = await this.payrollService.generatePayStub(id);
    return {
      success: true,
      data: payStub,
    };
  }
}
