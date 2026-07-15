import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InvitationsService } from '../../settings/invitations/invitations.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private invitationsService: InvitationsService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, invitedById: string, tenantId: string) {
    // If employee has email, send invitation first
    if (createEmployeeDto.email) {
      try {
        // Send invitation for employee type
        await this.invitationsService.create(invitedById, tenantId, {
          email: createEmployeeDto.email,
          type: 'employee',
          roleId: null, // Employees might not need specific roles initially
        });
        
        // Create employee record (they can complete profile after accepting invitation)
        const employee = await this.createEmployeeRecord(createEmployeeDto);
        
        return {
          employee,
          invitationSent: true,
          message: 'Employee created and invitation sent. They can set up their account using the invitation email.',
        };
      } catch (error) {
        // If invitation fails (e.g., user already exists), create employee without invitation
        if (error.message?.includes('already exists')) {
          const employee = await this.createEmployeeRecord(createEmployeeDto);
          return {
            employee,
            invitationSent: false,
            message: 'Employee created. User account already exists.',
          };
        }
        throw error;
      }
    } else {
      // No email provided, just create employee record
      const employee = await this.createEmployeeRecord(createEmployeeDto);
      return {
        employee,
        invitationSent: false,
        message: 'Employee created without email. No invitation sent.',
      };
    }
  }

  private async createEmployeeRecord(createEmployeeDto: CreateEmployeeDto) {
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
      hireDate: new Date(createEmployeeDto.hireDate),
    });

    return this.employeeRepository.save(employee);
  }

  async findAll() {
    return this.employeeRepository.find({
      relations: ['department', 'position', 'location', 'manager'],
    });
  }

  async findOne(id: string) {
    const where: any = { id };

    const employee = await this.employeeRepository.findOne({
      where,
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
