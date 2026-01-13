import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryStructure } from '../entities/salary-structure.entity';
import { EmployeeSalary } from '../entities/employee-salary.entity';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from './dto/update-salary-structure.dto';
import { CreateEmployeeSalaryDto } from './dto/create-employee-salary.dto';

@Injectable()
export class CompensationService {
  constructor(
    @InjectRepository(SalaryStructure)
    private salaryStructureRepository: Repository<SalaryStructure>,
    @InjectRepository(EmployeeSalary)
    private employeeSalaryRepository: Repository<EmployeeSalary>,
  ) {}

  // Salary Structures
  async createStructure(businessId: string, createDto: CreateSalaryStructureDto) {
    const structure = this.salaryStructureRepository.create({
      ...createDto,
      businessId,
    });

    // Calculate gross salary
    const allowancesTotal = Object.values(createDto.allowances || {}).reduce(
      (sum, val) => sum + Number(val),
      0,
    );
    const deductionsTotal = Object.values(createDto.deductions || {}).reduce(
      (sum, val) => sum + Number(val),
      0,
    );
    structure.baseSalary = createDto.baseSalary;

    return this.salaryStructureRepository.save(structure);
  }

  async findAllStructures(businessId: string, isActive?: boolean) {
    const where: any = { businessId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.salaryStructureRepository.find({
      where,
      relations: ['employeeSalaries', 'employeeSalaries.employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneStructure(id: string, businessId: string) {
    const structure = await this.salaryStructureRepository.findOne({
      where: { id, businessId },
      relations: ['employeeSalaries', 'employeeSalaries.employee'],
    });

    if (!structure) {
      throw new NotFoundException('Salary structure not found');
    }

    return structure;
  }

  async updateStructure(id: string, businessId: string, updateDto: UpdateSalaryStructureDto) {
    await this.findOneStructure(id, businessId);
    await this.salaryStructureRepository.update({ id }, updateDto);
    return this.findOneStructure(id, businessId);
  }

  async removeStructure(id: string, businessId: string) {
    await this.findOneStructure(id, businessId);
    await this.salaryStructureRepository.delete({ id });
  }

  // Employee Salaries
  async createEmployeeSalary(createDto: CreateEmployeeSalaryDto) {
    const allowancesTotal = Object.values(createDto.allowances || {}).reduce(
      (sum, val) => sum + Number(val),
      0,
    );
    const deductionsTotal = Object.values(createDto.deductions || {}).reduce(
      (sum, val) => sum + Number(val),
      0,
    );

    const salary = this.employeeSalaryRepository.create({
      ...createDto,
      grossSalary: Number(createDto.baseSalary) + allowancesTotal,
      netSalary: Number(createDto.baseSalary) + allowancesTotal - deductionsTotal,
      effectiveDate: new Date(createDto.effectiveDate),
      endDate: createDto.endDate ? new Date(createDto.endDate) : undefined,
    });

    return this.employeeSalaryRepository.save(salary);
  }

  async findAllEmployeeSalaries(employeeId?: string) {
    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.employeeSalaryRepository.find({
      where,
      relations: ['employee', 'structure'],
      order: { effectiveDate: 'DESC' },
    });
  }

  async findOneEmployeeSalary(id: string) {
    const salary = await this.employeeSalaryRepository.findOne({
      where: { id },
      relations: ['employee', 'structure'],
    });

    if (!salary) {
      throw new NotFoundException('Employee salary not found');
    }

    return salary;
  }

  async deactivateEmployeeSalary(id: string) {
    const salary = await this.findOneEmployeeSalary(id);
    salary.isActive = false;
    salary.endDate = new Date();
    return this.employeeSalaryRepository.save(salary);
  }
}

