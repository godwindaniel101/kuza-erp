import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  // Courses
  async createCourse(businessId: string, createDto: CreateCourseDto) {
    const course = this.courseRepository.create({
      ...createDto,
      businessId,
    });
    return this.courseRepository.save(course);
  }

  async findAllCourses(businessId: string, status?: string) {
    const where: any = { businessId };
    if (status) {
      where.status = status;
    }

    return this.courseRepository.find({
      where,
      relations: ['enrollments', 'enrollments.employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneCourse(id: string, businessId: string) {
    const course = await this.courseRepository.findOne({
      where: { id, businessId },
      relations: ['enrollments', 'enrollments.employee'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async updateCourse(id: string, businessId: string, updateDto: UpdateCourseDto) {
    await this.findOneCourse(id, businessId);
    await this.courseRepository.update({ id }, updateDto);
    return this.findOneCourse(id, businessId);
  }

  async removeCourse(id: string, businessId: string) {
    await this.findOneCourse(id, businessId);
    await this.courseRepository.delete({ id });
  }

  // Enrollments
  async createEnrollment(createDto: CreateEnrollmentDto) {
    const enrollment = this.enrollmentRepository.create({
      ...createDto,
      enrolledAt: new Date(),
    });
    return this.enrollmentRepository.save(enrollment);
  }

  async findAllEnrollments(employeeId?: string, courseId?: string) {
    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (courseId) {
      where.courseId = courseId;
    }

    return this.enrollmentRepository.find({
      where,
      relations: ['employee', 'course'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async findOneEnrollment(id: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['employee', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async updateEnrollmentProgress(id: string, progress: number, score?: number) {
    const enrollment = await this.findOneEnrollment(id);
    enrollment.progress = progress;
    if (score !== undefined) {
      enrollment.score = score;
    }
    if (progress >= 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }
    return this.enrollmentRepository.save(enrollment);
  }
}

