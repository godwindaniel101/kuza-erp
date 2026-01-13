import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Enrollment])],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}

