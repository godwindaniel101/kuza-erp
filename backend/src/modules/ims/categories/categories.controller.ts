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
import { CategoriesService } from "./categories.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { FeatureGateGuard, RequireApp } from "../../billing/guards/feature-gate.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("IMS - Categories")
@Controller("ims/categories")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard, FeatureGateGuard)
@RequireApp("items", "rms", "shop")
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get all categories" })
  async findAll() {
    const cats = await this.categoriesService.findAll();
    return { success: true, data: cats };
  }

  @Post()
  @RequirePermissions("inventory.create")
  @ApiOperation({ summary: "Create category" })
  async create(@Body() body: { name: string }) {
    const cat = await this.categoriesService.create(body);
    return { success: true, data: cat };
  }

  @Get(":id/subcategories")
  @RequirePermissions("inventory.view")
  @ApiOperation({ summary: "Get subcategories by category" })
  async findSubs(@Param("id") id: string) {
    const subs = await this.categoriesService.findSubcategories(id);
    return { success: true, data: subs };
  }

  @Post(":id/subcategories")
  @RequirePermissions("inventory.create")
  @ApiOperation({ summary: "Create subcategory for category" })
  async createSub(@Param("id") id: string, @Body() body: { name: string }) {
    const sub = await this.categoriesService.createSubcategory(id, body);
    return { success: true, data: sub };
  }

  @Delete(":categoryId/subcategories/:subcategoryId")
  @RequirePermissions("inventory.delete")
  @ApiOperation({ summary: "Delete subcategory" })
  async deleteSub(@Param("subcategoryId") subcategoryId: string) {
    await this.categoriesService.deleteSubcategory(subcategoryId);
    return { success: true, message: "Subcategory deleted successfully" };
  }
}
