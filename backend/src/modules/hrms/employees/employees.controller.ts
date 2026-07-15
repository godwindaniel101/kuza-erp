import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("HRMS - Employees")
@Controller("hrms/employees")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("people")
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions("employees.create")
  @ApiOperation({ summary: "Create a new employee (with invitation if email provided)" })
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() req,
    @I18n() i18n: I18nContext,
  ) {
    const result = await this.employeesService.create(
      createEmployeeDto, 
      req.user.id, // invitedById
      req.user.tenantId // tenantId
    );
    return {
      success: true,
      data: result,
      message: result.invitationSent 
        ? i18n.t("employees.created_with_invitation")
        : i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("employees.view")
  @ApiOperation({ summary: "Get all employees" })
  async findAll() {
    const employees = await this.employeesService.findAll();
    return {
      success: true,
      data: employees,
    };
  }

  @Get(":id")
  @RequirePermissions("employees.view")
  @ApiOperation({ summary: "Get employee by ID" })
  async findOne(@Param("id") id: string) {
    const employee = await this.employeesService.findOne(id);
    return {
      success: true,
      data: employee,
    };
  }

  @Patch(":id")
  @RequirePermissions("employees.edit")
  @ApiOperation({ summary: "Update employee" })
  async update(
    @Param("id") id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @I18n() i18n: I18nContext,
  ) {
    const employee = await this.employeesService.update(id, updateEmployeeDto);
    return {
      success: true,
      data: employee,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("employees.delete")
  @ApiOperation({ summary: "Delete employee" })
  async remove(@Param("id") id: string, @I18n() i18n: I18nContext) {
    await this.employeesService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }
}
