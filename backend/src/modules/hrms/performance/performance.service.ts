import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceReview } from '../entities/performance-review.entity';
import { PerformanceGoal } from '../entities/performance-goal.entity';
import { PerformanceRating } from '../entities/performance-rating.entity';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { UpdatePerformanceReviewDto } from './dto/update-performance-review.dto';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(PerformanceReview)
    private reviewRepository: Repository<PerformanceReview>,
    @InjectRepository(PerformanceGoal)
    private goalRepository: Repository<PerformanceGoal>,
    @InjectRepository(PerformanceRating)
    private ratingRepository: Repository<PerformanceRating>,
  ) {}

  async create(businessId: string, createDto: CreatePerformanceReviewDto) {
    let overallRating = 0;

    const review = this.reviewRepository.create({
      ...createDto,
      businessId,
      reviewDate: new Date(createDto.reviewDate),
      periodStart: new Date(createDto.periodStart),
      periodEnd: new Date(createDto.periodEnd),
    });

    const savedReview = await this.reviewRepository.save(review);

    // Create goals
    if (createDto.goals) {
      const goals = createDto.goals.map((goal) =>
        this.goalRepository.create({
          ...goal,
          reviewId: savedReview.id,
        }),
      );
      await this.goalRepository.save(goals);
    }

    // Create ratings and calculate average
    if (createDto.ratings) {
      const ratings = createDto.ratings.map((rating) =>
        this.ratingRepository.create({
          ...rating,
          reviewId: savedReview.id,
        }),
      );
      const savedRatings = await this.ratingRepository.save(ratings);
      overallRating =
        savedRatings.reduce((sum, r) => sum + Number(r.rating), 0) / savedRatings.length;
    }

    savedReview.overallRating = overallRating;
    return this.reviewRepository.save(savedReview);
  }

  async findAll(businessId: string, employeeId?: string) {
    const where: any = { businessId };
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.reviewRepository.find({
      where,
      relations: ['employee', 'goals', 'ratings'],
      order: { reviewDate: 'DESC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id, businessId },
      relations: ['employee', 'goals', 'ratings'],
    });

    if (!review) {
      throw new NotFoundException('Performance review not found');
    }

    return review;
  }

  async update(id: string, businessId: string, updateDto: UpdatePerformanceReviewDto) {
    await this.findOne(id, businessId);
    await this.reviewRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async complete(id: string, businessId: string) {
    const review = await this.findOne(id, businessId);
    review.status = 'completed';
    review.completedAt = new Date();
    return this.reviewRepository.save(review);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.reviewRepository.delete({ id });
  }
}

