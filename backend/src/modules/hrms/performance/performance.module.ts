import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceReview } from '../entities/performance-review.entity';
import { PerformanceGoal } from '../entities/performance-goal.entity';
import { PerformanceRating } from '../entities/performance-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PerformanceReview, PerformanceGoal, PerformanceRating])],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}

