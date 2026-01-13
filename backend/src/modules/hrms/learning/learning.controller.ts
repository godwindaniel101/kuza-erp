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
import { LearningService } from './learning.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';

@ApiTags('HRMS - Learning & Development')
@Controller('hrms/learning')
@UseGuardsDecorator(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post('courses')
  @RequirePermissions('learning.create')
  @ApiOperation({ summary: 'Create course' })
  async createCourse(@Request() req, @Body() createDto: CreateCourseDto, @I18n() i18n: I18nContext) {
    const course = await this.learningService.createCourse(req.user.businessId, createDto);
    return {
      success: true,
      data: course,
      message: i18n.t('common.created'),
    };
  }

  @Get('courses')
  @RequirePermissions('learning.view')
  @ApiOperation({ summary: 'Get all courses' })
  async findAllCourses(@Request() req, @Query('status') status?: string) {
    const courses = await this.learningService.findAllCourses(req.user.businessId, status);
    return {
      success: true,
      data: courses,
    };
  }

  @Get('courses/:id')
  @RequirePermissions('learning.view')
  @ApiOperation({ summary: 'Get course by ID' })
  async findOneCourse(@Request() req, @Param('id') id: string) {
    const course = await this.learningService.findOneCourse(id, req.user.businessId);
    return {
      success: true,
      data: course,
    };
  }

  @Patch('courses/:id')
  @RequirePermissions('learning.edit')
  @ApiOperation({ summary: 'Update course' })
  async updateCourse(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCourseDto,
    @I18n() i18n: I18nContext,
  ) {
    const course = await this.learningService.updateCourse(id, req.user.businessId, updateDto);
    return {
      success: true,
      data: course,
      message: i18n.t('common.updated'),
    };
  }

  @Delete('courses/:id')
  @RequirePermissions('learning.delete')
  @ApiOperation({ summary: 'Delete course' })
  async removeCourse(@Request() req, @Param('id') id: string, @I18n() i18n: I18nContext) {
    await this.learningService.removeCourse(id, req.user.businessId);
    return {
      success: true,
      message: i18n.t('common.deleted'),
    };
  }

  @Post('enrollments')
  @RequirePermissions('learning.enroll')
  @ApiOperation({ summary: 'Create enrollment' })
  async createEnrollment(@Body() createDto: CreateEnrollmentDto, @I18n() i18n: I18nContext) {
    const enrollment = await this.learningService.createEnrollment(createDto);
    return {
      success: true,
      data: enrollment,
      message: i18n.t('common.created'),
    };
  }

  @Get('enrollments')
  @RequirePermissions('learning.view')
  @ApiOperation({ summary: 'Get all enrollments' })
  async findAllEnrollments(@Query('employeeId') employeeId?: string, @Query('courseId') courseId?: string) {
    const enrollments = await this.learningService.findAllEnrollments(employeeId, courseId);
    return {
      success: true,
      data: enrollments,
    };
  }

  @Patch('enrollments/:id/progress')
  @RequirePermissions('learning.edit')
  @ApiOperation({ summary: 'Update enrollment progress' })
  async updateProgress(
    @Param('id') id: string,
    @Body() body: { progress: number; score?: number },
    @I18n() i18n: I18nContext,
  ) {
    const enrollment = await this.learningService.updateEnrollmentProgress(id, body.progress, body.score);
    return {
      success: true,
      data: enrollment,
      message: i18n.t('common.updated'),
    };
  }
}

