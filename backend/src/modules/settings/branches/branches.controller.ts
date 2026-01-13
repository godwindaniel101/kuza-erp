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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('Settings - Branches')
@Controller('settings/branches')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('branches.create')
  @ApiOperation({ summary: 'Create branch' })
  async create(@Request() req, @Body() createDto: CreateBranchDto, @I18n() i18n: I18nContext) {
    const branch = await this.branchesService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: branch,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('branches.view')
  @ApiOperation({ summary: 'Get all branches' })
  async findAll(@Request() req, @Query('includeStats') includeStats?: string) {
    const branches = await this.branchesService.findAll(
      req.user.businessId,
      includeStats === 'true',
    );
    return {
      success: true,
      data: branches,
    };
  }

  @Get(':id')
  @RequirePermissions('branches.view')
  @ApiOperation({ summary: 'Get branch by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const branch = await this.branchesService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: branch,
    };
  }

  @Patch(':id')
  @RequirePermissions('branches.edit')
  @ApiOperation({ summary: 'Update branch' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateBranchDto,
    @I18n() i18n: I18nContext,
  ) {
    const branch = await this.branchesService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: branch,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('branches.delete')
  @ApiOperation({ summary: 'Delete branch' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.branchesService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

