import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(businessId: string, createEmployeeDto: CreateEmployeeDto) {
    // Generate employee number
    const year = new Date().getFullYear();
    const count = await this.employeeRepository.count({
      where: {
        employeeNumber: Like(`EMP-${year}-%`),
      },
    });
    const employeeNumber = `EMP-${year}-${String(count + 1).padStart(4, '0')}`;

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      employeeNumber,
      businessId,
      hireDate: new Date(createEmployeeDto.hireDate),
    });

    return this.employeeRepository.save(employee);
  }

  async findAll(businessId: string) {
    return this.employeeRepository.find({
      where: { businessId },
      relations: ['department', 'position', 'location', 'manager'],
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['department', 'position', 'location', 'manager', 'directReports'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.findOne(id);
    
    const updateData: any = { ...updateEmployeeDto };
    if (updateEmployeeDto.hireDate) {
      updateData.hireDate = new Date(updateEmployeeDto.hireDate);
    }
    
    await this.employeeRepository.update({ id }, updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.employeeRepository.delete({ id });
  }
}
