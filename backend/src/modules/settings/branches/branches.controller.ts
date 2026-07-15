import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { I18n, I18nContext } from "nestjs-i18n";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  RequirePermissions,
  PermissionsGuard,
} from "../../../common/guards/permissions.guard";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";

@ApiTags("Settings - Branches")
@Controller("settings/branches")
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions("branches.create")
  @ApiOperation({ summary: "Create branch" })
  async create(@Body() createDto: CreateBranchDto, @I18n() i18n: I18nContext) {
    const branch = await this.branchesService.create(createDto);
    return {
      success: true,
      data: branch,
      message: i18n.t("common.created"),
    };
  }

  @Get()
  @RequirePermissions("branches.view")
  @ApiOperation({ summary: "Get all branches" })
  async findAll(@Query("includeStats") includeStats?: string) {
    const branches = await this.branchesService.findAll(
      includeStats === "true",
    );
    return {
      success: true,
      data: branches,
    };
  }

  @Get(":id")
  @RequirePermissions("branches.view")
  @ApiOperation({ summary: "Get branch by ID" })
  async findOne(@Param("id") id: string) {
    const branch = await this.branchesService.findOne(id);
    return {
      success: true,
      data: branch,
    };
  }

  @Patch(":id")
  @RequirePermissions("branches.edit")
  @ApiOperation({ summary: "Update branch" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateBranchDto,
    @I18n() i18n: I18nContext,
  ) {
    const branch = await this.branchesService.update(id, updateDto);
    return {
      success: true,
      data: branch,
      message: i18n.t("common.updated"),
    };
  }

  @Delete(":id")
  @RequirePermissions("branches.delete")
  @ApiOperation({ summary: "Delete branch" })
  async remove(@Param("id") id: string, @I18n() i18n: I18nContext) {
    await this.branchesService.remove(id);
    return {
      success: true,
      message: i18n.t("common.deleted"),
    };
  }

  @Get("template/download")
  @RequirePermissions("branches.view")
  @ApiOperation({ summary: "Download CSV template for bulk branch upload" })
  async downloadTemplate() {
    const template = await this.branchesService.generateTemplate();
    return {
      success: true,
      data: template,
      message: "Template generated successfully",
    };
  }

  @Post("bulk-upload")
  @RequirePermissions("branches.create")
  @ApiOperation({ summary: "Bulk upload branches from CSV" })
  async bulkUpload(@Body() body: { csv: string }, @I18n() i18n: I18nContext) {
    console.log(`[CONTROLLER] Branch CSV length: ${body.csv?.length || 0}`);

    const results = await this.branchesService.bulkUpload(body.csv);

    console.log(`[CONTROLLER] Branch bulk upload results:`, {
      success: results.success,
      errors: results.errors,
      skipped: results.skipped,
      failedCount: results.failedUploads.length
    });

    // Enhanced response with detailed error information
    const response = {
      success: true,
      data: {
        ...results,
        summary: {
          totalProcessed: results.success + results.failedUploads.length + results.skipped,
          successful: results.success,
          failed: results.failedUploads.length,
          skipped: results.skipped,
          hasErrors: results.errors.length > 0 || results.failedUploads.length > 0
        },
        detailedErrors: results.failedUploads.map(failed => ({
          line: failed.lineNumber,
          branchName: failed.rowData['branch name'] || 'Unknown',
          errors: failed.errors,
          status: failed.status,
          data: failed.rowData
        }))
      },
      message: i18n.t("common.uploaded"),
    };

    return response;
  }
}
