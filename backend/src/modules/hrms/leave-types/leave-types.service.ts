import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType } from '../entities/leave-type.entity';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectRepository(LeaveType)
    private leaveTypeRepository: Repository<LeaveType>,
  ) {}

  async create(businessId: string, createDto: CreateLeaveTypeDto) {
    const leaveType = this.leaveTypeRepository.create({
      ...createDto,
      businessId,
    });
    return this.leaveTypeRepository.save(leaveType);
  }

  async findAll(businessId: string) {
    return this.leaveTypeRepository.find({
      where: { businessId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const leaveType = await this.leaveTypeRepository.findOne({
      where: { id, businessId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return leaveType;
  }

  async update(id: string, businessId: string, updateDto: UpdateLeaveTypeDto) {
    await this.findOne(id, businessId);
    await this.leaveTypeRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.leaveTypeRepository.delete({ id });
  }
}

