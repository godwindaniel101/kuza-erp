import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveType } from '../entities/leave-type.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveType)
    private leaveTypeRepository: Repository<LeaveType>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    private notificationsService: NotificationsService,
  ) {}

  async create(employeeId: string, createDto: CreateLeaveRequestDto) {
    const leaveType = await this.leaveTypeRepository.findOne({
      where: { id: createDto.leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Calculate days
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    const year = new Date().getFullYear();
    const balance = await this.leaveBalanceRepository.findOne({
      where: {
        employeeId,
        leaveTypeId: createDto.leaveTypeId,
        year,
      },
    });

    if (balance && balance.balance < days) {
      throw new Error('Insufficient leave balance');
    }

    const leaveRequest = this.leaveRequestRepository.create({
      ...createDto,
      employeeId,
      days,
    });

    const saved = await this.leaveRequestRepository.save(leaveRequest);

    // Send notification to manager
    // TODO: Get manager email from employee
    // await this.notificationsService.sendLeaveRequestNotification(...);

    return saved;
  }

  async findAll(employeeId?: string) {
    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.leaveRequestRepository.find({
      where,
      relations: ['employee', 'leaveType'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const request = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'leaveType'],
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    return request;
  }

  async approve(id: string, approvedBy: string) {
    const request = await this.findOne(id);
    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();

    // Update balance
    const year = new Date().getFullYear();
    const balance = await this.leaveBalanceRepository.findOne({
      where: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
    });

    if (balance) {
      balance.used = Number(balance.used) + Number(request.days);
      balance.balance = Number(balance.balance) - Number(request.days);
      await this.leaveBalanceRepository.save(balance);
    }

    return this.leaveRequestRepository.save(request);
  }

  async reject(id: string, rejectedBy: string, reason: string) {
    const request = await this.findOne(id);
    request.status = 'rejected';
    request.rejectedBy = rejectedBy;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;

    return this.leaveRequestRepository.save(request);
  }
}

