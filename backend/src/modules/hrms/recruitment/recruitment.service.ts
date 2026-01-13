import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting } from '../entities/job-posting.entity';
import { JobApplication } from '../entities/job-application.entity';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(JobPosting)
    private jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>,
  ) {}

  // Job Postings
  async createJobPosting(businessId: string, createDto: CreateJobPostingDto) {
    const posting = this.jobPostingRepository.create({
      ...createDto,
      businessId,
      postedDate: new Date(),
    });
    return this.jobPostingRepository.save(posting);
  }

  async findAllJobPostings(businessId: string, status?: string) {
    const where: any = { businessId };
    if (status) {
      where.status = status;
    }

    return this.jobPostingRepository.find({
      where,
      relations: ['department', 'position', 'applications'],
      order: { postedDate: 'DESC' },
    });
  }

  async findOneJobPosting(id: string, businessId: string) {
    const posting = await this.jobPostingRepository.findOne({
      where: { id, businessId },
      relations: ['department', 'position', 'applications'],
    });

    if (!posting) {
      throw new NotFoundException('Job posting not found');
    }

    return posting;
  }

  async updateJobPosting(id: string, businessId: string, updateDto: UpdateJobPostingDto) {
    await this.findOneJobPosting(id, businessId);
    await this.jobPostingRepository.update({ id }, updateDto);
    return this.findOneJobPosting(id, businessId);
  }

  async removeJobPosting(id: string, businessId: string) {
    await this.findOneJobPosting(id, businessId);
    await this.jobPostingRepository.delete({ id });
  }

  // Job Applications
  async createApplication(jobPostingId: string, createDto: CreateJobApplicationDto) {
    const application = this.jobApplicationRepository.create({
      ...createDto,
      jobPostingId,
    });

    const saved = await this.jobApplicationRepository.save(application);

    // Update application count
    const posting = await this.jobPostingRepository.findOne({
      where: { id: jobPostingId },
    });
    if (posting) {
      posting.applicationsCount += 1;
      await this.jobPostingRepository.save(posting);
    }

    return saved;
  }

  async findAllApplications(jobPostingId?: string) {
    const where: any = {};
    if (jobPostingId) {
      where.jobPostingId = jobPostingId;
    }

    return this.jobApplicationRepository.find({
      where,
      relations: ['jobPosting'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneApplication(id: string) {
    const application = await this.jobApplicationRepository.findOne({
      where: { id },
      relations: ['jobPosting'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    return application;
  }

  async updateApplicationStatus(id: string, status: string, reviewedBy: string, notes?: string) {
    const application = await this.findOneApplication(id);
    application.status = status;
    application.reviewedBy = reviewedBy;
    application.reviewedAt = new Date();
    if (notes) {
      application.notes = notes;
    }
    return this.jobApplicationRepository.save(application);
  }
}

