import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";

@ApiTags("HRMS - Departments")
@Controller("hrms/departments")
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("people")
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions("departments.create")
  @ApiOperation({ summary: "Create a new department" })
  async create(createDto: CreateDepartmentDto, @I18n() i18n: I18nContext) {
    const department = await this.departmentsService.create(createDto);
    return {
      success: true,
      data: department,
      message: i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("departments.view")
  @ApiOperation({ summary: "Get all departments" })
  async findAll() {
    const departments = await this.departmentsService.findAll();
    return {
      success: true,
      data: departments,
    };
  }

  @Get(":id")
  @RequirePermissions("departments.view")
  @ApiOperation({ summary: "Get department by ID" })
  async findOne(@Param("id") id: string) {
    const department = await this.departmentsService.findOne(id);
    return {
      success: true,
      data: department,
    };
  }

  @Patch(":id")
  @RequirePermissions("departments.edit")
  @ApiOperation({ summary: "Update department" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateDepartmentDto,
    @I18n() i18n: I18nContext,
  ) {
    const department = await this.departmentsService.update(id, updateDto);
    return {
      success: true,
      data: department,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("departments.delete")
  @ApiOperation({ summary: "Delete department" })
  async remove(@Param("id") id: string, @I18n() i18n: I18nContext) {
    await this.departmentsService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }
}
