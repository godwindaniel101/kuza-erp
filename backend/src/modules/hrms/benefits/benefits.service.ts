import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenefitPlan } from '../entities/benefit-plan.entity';
import { EmployeeBenefit } from '../entities/employee-benefit.entity';
import { CreateBenefitPlanDto } from './dto/create-benefit-plan.dto';
import { UpdateBenefitPlanDto } from './dto/update-benefit-plan.dto';
import { CreateEmployeeBenefitDto } from './dto/create-employee-benefit.dto';

@Injectable()
export class BenefitsService {
  constructor(
    @InjectRepository(BenefitPlan)
    private benefitPlanRepository: Repository<BenefitPlan>,
    @InjectRepository(EmployeeBenefit)
    private employeeBenefitRepository: Repository<EmployeeBenefit>,
  ) {}

  // Benefit Plans
  async createPlan(businessId: string, createDto: CreateBenefitPlanDto) {
    const plan = this.benefitPlanRepository.create({
      ...createDto,
      businessId,
      effectiveDate: createDto.effectiveDate ? new Date(createDto.effectiveDate) : undefined,
      expirationDate: createDto.expirationDate ? new Date(createDto.expirationDate) : undefined,
    });
    return this.benefitPlanRepository.save(plan);
  }

  async findAllPlans(businessId: string, isActive?: boolean) {
    const where: any = { businessId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.benefitPlanRepository.find({
      where,
      relations: ['employeeBenefits', 'employeeBenefits.employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOnePlan(id: string, businessId: string) {
    const plan = await this.benefitPlanRepository.findOne({
      where: { id, businessId },
      relations: ['employeeBenefits', 'employeeBenefits.employee'],
    });

    if (!plan) {
      throw new NotFoundException('Benefit plan not found');
    }

    return plan;
  }

  async updatePlan(id: string, businessId: string, updateDto: UpdateBenefitPlanDto) {
    await this.findOnePlan(id, businessId);
    await this.benefitPlanRepository.update({ id }, updateDto);
    return this.findOnePlan(id, businessId);
  }

  async removePlan(id: string, businessId: string) {
    await this.findOnePlan(id, businessId);
    await this.benefitPlanRepository.delete({ id });
  }

  // Employee Benefits
  async createEmployeeBenefit(createDto: CreateEmployeeBenefitDto) {
    const benefit = this.employeeBenefitRepository.create({
      ...createDto,
      enrollmentDate: new Date(createDto.enrollmentDate),
    });
    return this.employeeBenefitRepository.save(benefit);
  }

  async findAllEmployeeBenefits(employeeId?: string, planId?: string) {
    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (planId) {
      where.planId = planId;
    }

    return this.employeeBenefitRepository.find({
      where,
      relations: ['employee', 'plan'],
      order: { enrollmentDate: 'DESC' },
    });
  }

  async findOneEmployeeBenefit(id: string) {
    const benefit = await this.employeeBenefitRepository.findOne({
      where: { id },
      relations: ['employee', 'plan'],
    });

    if (!benefit) {
      throw new NotFoundException('Employee benefit not found');
    }

    return benefit;
  }

  async terminateEmployeeBenefit(id: string, terminationDate: Date) {
    const benefit = await this.findOneEmployeeBenefit(id);
    benefit.status = 'terminated';
    benefit.terminationDate = terminationDate;
    return this.employeeBenefitRepository.save(benefit);
  }
}

