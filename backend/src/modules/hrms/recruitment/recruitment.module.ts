import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { JobPosting } from '../entities/job-posting.entity';
import { JobApplication } from '../entities/job-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobPosting, JobApplication])],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}

