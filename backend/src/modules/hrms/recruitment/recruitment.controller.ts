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
import { RecruitmentService } from './recruitment.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Recruitment')
@Controller('hrms/recruitment')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('postings')
  @RequirePermissions('recruitment.create')
  @ApiOperation({ summary: 'Create job posting' })
  async createPosting(@Request() req, @Body() createDto: CreateJobPostingDto, @I18n() i18n: I18nContext) {
    const posting = await this.recruitmentService.createJobPosting(req.user.businessId, createDto);
    return {
      success: true,
      data: posting,
      message: i18n.t('common.created'),
    };
  }

  @Get('postings')
  @RequirePermissions('recruitment.view')
  @ApiOperation({ summary: 'Get all job postings' })
  async findAllPostings(@Request() req, @Query('status') status?: string) {
    const postings = await this.recruitmentService.findAllJobPostings(req.user.businessId, status);
    return {
      success: true,
      data: postings,
    };
  }

  @Get('postings/:id')
  @RequirePermissions('recruitment.view')
  @ApiOperation({ summary: 'Get job posting by ID' })
  async findOnePosting(@Request() req, @Param('id') id: string) {
    const posting = await this.recruitmentService.findOneJobPosting(id, req.user.businessId);
    return {
      success: true,
      data: posting,
    };
  }

  @Patch('postings/:id')
  @RequirePermissions('recruitment.edit')
  @ApiOperation({ summary: 'Update job posting' })
  async updatePosting(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateJobPostingDto,
    @I18n() i18n: I18nContext,
  ) {
    const posting = await this.recruitmentService.updateJobPosting(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: posting,
      message: i18n.t('common.updated'),
    };
  }

  @Delete('postings/:id')
  @RequirePermissions('recruitment.delete')
  @ApiOperation({ summary: 'Delete job posting' })
  async removePosting(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.recruitmentService.removeJobPosting(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  @Post('applications')
  @ApiOperation({ summary: 'Create job application' })
  async createApplication(@Body() createDto: CreateJobApplicationDto, @I18n() i18n: I18nContext) {
    const application = await this.recruitmentService.createApplication(createDto.jobPostingId, createDto);
    return {
      success: true,
      data: application,
      message: i18n.t('common.created'),
    };
  }

  @Get('applications')
  @RequirePermissions('recruitment.view')
  @ApiOperation({ summary: 'Get all job applications' })
  async findAllApplications(@Query('jobPostingId') jobPostingId?: string) {
    const applications = await this.recruitmentService.findAllApplications(jobPostingId);
    return {
      success: true,
      data: applications,
    };
  }

  @Get('applications/:id')
  @RequirePermissions('recruitment.view')
  @ApiOperation({ summary: 'Get job application by ID' })
  async findOneApplication(@Param('id') id: string) {
    const application = await this.recruitmentService.findOneApplication(id);
    return {
      success: true,
      data: application,
    };
  }

  @Post('applications/:id/status')
  @RequirePermissions('recruitment.edit')
  @ApiOperation({ summary: 'Update application status' })
  async updateApplicationStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
    @I18n() i18n: I18nContext,
  ) {
    const application = await this.recruitmentService.updateApplicationStatus(
      id,
      body.status,
      req.user.sub,
      body.notes,
    );
    return {
      success: true,
      data: application,
      message: i18n.t('common.updated'),
    };
  }
}

