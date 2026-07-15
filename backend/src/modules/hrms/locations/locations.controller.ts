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
import { LocationsService } from "./locations.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";

@ApiTags("HRMS - Locations")
@Controller("hrms/locations")
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("people")
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @RequirePermissions("locations.create")
  @ApiOperation({ summary: "Create a new location" })
  async create(
    @Body() createDto: CreateLocationDto,
    @I18n() i18n: I18nContext,
  ) {
    const location = await this.locationsService.create(createDto);
    return {
      success: true,
      data: location,
      message: i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("locations.view")
  @ApiOperation({ summary: "Get all locations" })
  async findAll() {
    const locations = await this.locationsService.findAll();
    return {
      success: true,
      data: locations,
    };
  }

  @Get(":id")
  @RequirePermissions("locations.view")
  @ApiOperation({ summary: "Get location by ID" })
  async findOne(@Param("id") id: string) {
    const location = await this.locationsService.findOne(id);
    return {
      success: true,
      data: location,
    };
  }

  @Patch(":id")
  @RequirePermissions("locations.edit")
  @ApiOperation({ summary: "Update location" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateLocationDto,
    @I18n() i18n: I18nContext,
  ) {
    const location = await this.locationsService.update(id, updateDto);
    return {
      success: true,
      data: location,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("locations.delete")
  @ApiOperation({ summary: "Delete location" })
  async remove(@Param("id") id: string, @I18n() i18n: I18nContext) {
    await this.locationsService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }
}
