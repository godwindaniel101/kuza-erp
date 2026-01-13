import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';

@ApiTags('HRMS - Positions')
@Controller('hrms/positions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @RequirePermissions('positions.create')
  @ApiOperation({ summary: 'Create a new position' })
  async create(@Request() req, @Body() createDto: CreatePositionDto, @I18n() i18n: I18nContext) {
    const position = await this.positionsService.create(req.user.businessId, createDto);
    return {
      success: true,
      data: position,
      message: i18n.t('common.created'),
    };
  }

  @Get()
  @RequirePermissions('positions.view')
  @ApiOperation({ summary: 'Get all positions' })
  async findAll(@Request() req, @Query('departmentId') departmentId?: string) {
    const positions = await this.positionsService.findAll(req.user.businessId, departmentId);
    return {
      success: true,
      data: positions,
    };
  }

  @Get(':id')
  @RequirePermissions('positions.view')
  @ApiOperation({ summary: 'Get position by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const position = await this.positionsService.findOne(id, req.user.businessId);
    return {
      success: true,
      data: position,
    };
  }

  @Patch(':id')
  @RequirePermissions('positions.edit')
  @ApiOperation({ summary: 'Update position' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdatePositionDto,
    @I18n() i18n: I18nContext,
  ) {
    const position = await this.positionsService.update(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: position,
      message: i18n.t('common.updated'),
    };
  }

  @Delete(':id')
  @RequirePermissions('positions.delete')
  @ApiOperation({ summary: 'Delete position' })
  async remove(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.positionsService.remove(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }
}

