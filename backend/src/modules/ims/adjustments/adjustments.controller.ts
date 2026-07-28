import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AdjustmentsService } from "./adjustments.service";
import {
  CreateAdjustmentDto,
  QueryAdjustmentsDto,
} from "./dto/create-adjustment.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("IMS - Inventory Adjustments")
@Controller("ims/adjustments")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items", "rms")
@ApiBearerAuth()
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @Get()
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "List inventory adjustments (paginated)" })
  async findAll(@Query() query: QueryAdjustmentsDto) {
    const data = await this.adjustmentsService.findAll(query);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions("inventory.create")
  @ApiOperation({ summary: "Create a DRAFT inventory adjustment" })
  async create(@Request() req, @Body() createDto: CreateAdjustmentDto) {
    const adjustment = await this.adjustmentsService.create(
      createDto,
      req.user?.sub,
    );
    return { success: true, data: adjustment };
  }

  @Get(":id")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get an inventory adjustment by ID" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const adjustment = await this.adjustmentsService.findOne(id);
    return { success: true, data: adjustment };
  }

  @Post(":id/approve")
  @RequirePermissions("inventory.approve")
  @ApiOperation({
    summary: "Approve a DRAFT adjustment and apply its stock changes",
  })
  async approve(@Request() req, @Param("id", ParseUUIDPipe) id: string) {
    const adjustment = await this.adjustmentsService.approve(
      id,
      req.user?.sub,
    );
    return { success: true, data: adjustment };
  }

  @Post(":id/reject")
  @RequirePermissions("inventory.approve")
  @ApiOperation({ summary: "Reject a DRAFT adjustment (no stock change)" })
  async reject(@Request() req, @Param("id", ParseUUIDPipe) id: string) {
    const adjustment = await this.adjustmentsService.reject(id, req.user?.sub);
    return { success: true, data: adjustment };
  }
}
