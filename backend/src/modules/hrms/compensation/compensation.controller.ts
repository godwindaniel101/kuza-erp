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
import { CompensationService } from './compensation.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from './dto/update-salary-structure.dto';
import { CreateEmployeeSalaryDto } from './dto/create-employee-salary.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Compensation')
@Controller('hrms/compensation')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CompensationController {
  constructor(private readonly compensationService: CompensationService) {}

  @Post('structures')
  @RequirePermissions('compensation.create')
  @ApiOperation({ summary: 'Create salary structure' })
  async createStructure(
    @Request() req,
    @Body() createDto: CreateSalaryStructureDto,
    @I18n() i18n: I18nContext,
  ) {
    const structure = await this.compensationService.createStructure(req.user.businessId, createDto);
    return {
      success: true,
      data: structure,
      message: i18n.t('common.created'),
    };
  }

  @Get('structures')
  @RequirePermissions('compensation.view')
  @ApiOperation({ summary: 'Get all salary structures' })
  async findAllStructures(@Request() req, @Query('isActive') isActive?: string) {
    const structures = await this.compensationService.findAllStructures(
      req.user.businessId,
      isActive === 'true',
    );
    return {
      success: true,
      data: structures,
    };
  }

  @Get('structures/:id')
  @RequirePermissions('compensation.view')
  @ApiOperation({ summary: 'Get salary structure by ID' })
  async findOneStructure(@Request() req, @Param('id') id: string) {
    const structure = await this.compensationService.findOneStructure(id, req.user.businessId);
    return {
      success: true,
      data: structure,
    };
  }

  @Patch('structures/:id')
  @RequirePermissions('compensation.edit')
  @ApiOperation({ summary: 'Update salary structure' })
  async updateStructure(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSalaryStructureDto,
    @I18n() i18n: I18nContext,
  ) {
    const structure = await this.compensationService.updateStructure(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: structure,
      message: i18n.t('common.updated'),
    };
  }

  @Delete('structures/:id')
  @RequirePermissions('compensation.delete')
  @ApiOperation({ summary: 'Delete salary structure' })
  async removeStructure(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.compensationService.removeStructure(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  @Post('employee-salaries')
  @RequirePermissions('compensation.create')
  @ApiOperation({ summary: 'Create employee salary' })
  async createEmployeeSalary(@Body() createDto: CreateEmployeeSalaryDto, @I18n() i18n: I18nContext) {
    const salary = await this.compensationService.createEmployeeSalary(createDto);
    return {
      success: true,
      data: salary,
      message: i18n.t('common.created'),
    };
  }

  @Get('employee-salaries')
  @RequirePermissions('compensation.view')
  @ApiOperation({ summary: 'Get all employee salaries' })
  async findAllEmployeeSalaries(@Query('employeeId') employeeId?: string) {
    const salaries = await this.compensationService.findAllEmployeeSalaries(employeeId);
    return {
      success: true,
      data: salaries,
    };
  }
}

