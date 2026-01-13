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
import { BenefitsService } from './benefits.service';
import { CreateBenefitPlanDto } from './dto/create-benefit-plan.dto';
import { UpdateBenefitPlanDto } from './dto/update-benefit-plan.dto';
import { CreateEmployeeBenefitDto } from './dto/create-employee-benefit.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Benefits')
@Controller('hrms/benefits')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Post('plans')
  @RequirePermissions('benefits.create')
  @ApiOperation({ summary: 'Create benefit plan' })
  async createPlan(@Request() req, @Body() createDto: CreateBenefitPlanDto, @I18n() i18n: I18nContext) {
    const plan = await this.benefitsService.createPlan(req.user.businessId, createDto);
    return {
      success: true,
      data: plan,
      message: i18n.t('common.created'),
    };
  }

  @Get('plans')
  @RequirePermissions('benefits.view')
  @ApiOperation({ summary: 'Get all benefit plans' })
  async findAllPlans(@Request() req, @Query('isActive') isActive?: string) {
    const plans = await this.benefitsService.findAllPlans(
      req.user.businessId,
      isActive === 'true',
    );
    return {
      success: true,
      data: plans,
    };
  }

  @Get('plans/:id')
  @RequirePermissions('benefits.view')
  @ApiOperation({ summary: 'Get benefit plan by ID' })
  async findOnePlan(@Request() req, @Param('id') id: string) {
    const plan = await this.benefitsService.findOnePlan(id, req.user.businessId);
    return {
      success: true,
      data: plan,
    };
  }

  @Patch('plans/:id')
  @RequirePermissions('benefits.edit')
  @ApiOperation({ summary: 'Update benefit plan' })
  async updatePlan(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateBenefitPlanDto,
    @I18n() i18n: I18nContext,
  ) {
    const plan = await this.benefitsService.updatePlan(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: plan,
      message: i18n.t('common.updated'),
    };
  }

  @Delete('plans/:id')
  @RequirePermissions('benefits.delete')
  @ApiOperation({ summary: 'Delete benefit plan' })
  async removePlan(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.benefitsService.removePlan(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  @Post('employee-benefits')
  @RequirePermissions('benefits.enroll')
  @ApiOperation({ summary: 'Create employee benefit enrollment' })
  async createEmployeeBenefit(@Body() createDto: CreateEmployeeBenefitDto, @I18n() i18n: I18nContext) {
    const benefit = await this.benefitsService.createEmployeeBenefit(createDto);
    return {
      success: true,
      data: benefit,
      message: i18n.t('common.created'),
    };
  }

  @Get('employee-benefits')
  @RequirePermissions('benefits.view')
  @ApiOperation({ summary: 'Get all employee benefits' })
  async findAllEmployeeBenefits(@Query('employeeId') employeeId?: string, @Query('planId') planId?: string) {
    const benefits = await this.benefitsService.findAllEmployeeBenefits(employeeId, planId);
    return {
      success: true,
      data: benefits,
    };
  }
}

