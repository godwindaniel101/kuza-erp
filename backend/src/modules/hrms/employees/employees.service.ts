import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InvitationsService } from '../../settings/invitations/invitations.service';

/** A node in the reporting hierarchy returned by GET /hrms/employees/org-chart. */
export interface OrgNode {
  id: string;
  name: string;
  title: string | null;
  department: string | null;
  avatarUrl?: string;
  reports: OrgNode[];
}

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

  async getOrgChart(): Promise<OrgNode[]> {
    // Single query (tenant-scoped by connection) + in-memory tree build — no N+1.
    const employees = await this.employeeRepository.find({
      relations: ['position', 'department'],
    });

    // Index nodes by id and remember each employee's managerId.
    const nodeById = new Map<string, OrgNode>();
    const managerIdById = new Map<string, string | null>();

    for (const emp of employees) {
      const name =
        emp.preferredName?.trim() ||
        [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() ||
        emp.email;

      const node: OrgNode = {
        id: emp.id,
        name,
        title: emp.position?.title ?? null,
        department: emp.department?.name ?? null,
        reports: [],
      };
      if (emp.profilePhotoPath) {
        node.avatarUrl = emp.profilePhotoPath;
      }

      nodeById.set(emp.id, node);
      managerIdById.set(emp.id, emp.managerId ?? null);
    }

    // Assemble the forest. A node is a root when it has no manager, or its
    // manager is outside this set. Cycles are broken by walking managers and
    // treating any node reachable in a loop back to itself as a root.
    const roots: OrgNode[] = [];

    const isReachableAsAncestor = (startId: string, targetId: string): boolean => {
      // Does targetId appear as an ancestor (via managerId) of startId?
      let currentId: string | null | undefined = managerIdById.get(startId);
      const seen = new Set<string>();
      while (currentId && !seen.has(currentId)) {
        if (currentId === targetId) return true;
        seen.add(currentId);
        currentId = managerIdById.get(currentId) ?? null;
      }
      return false;
    };

    for (const emp of employees) {
      const node = nodeById.get(emp.id)!;
      const managerId = managerIdById.get(emp.id);
      const managerNode = managerId ? nodeById.get(managerId) : undefined;

      // Root if: no manager, manager not in set, self-reference, or attaching
      // would form a cycle (manager is already a descendant of this node).
      if (
        !managerNode ||
        managerId === emp.id ||
        isReachableAsAncestor(managerId!, emp.id)
      ) {
        roots.push(node);
      } else {
        managerNode.reports.push(node);
      }
    }

    return roots;
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
