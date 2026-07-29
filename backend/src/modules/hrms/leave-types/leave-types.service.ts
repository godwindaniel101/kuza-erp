import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LeaveType } from "../entities/leave-type.entity";
import { CreateLeaveTypeDto } from "./dto/create-leave-type.dto";
import { UpdateLeaveTypeDto } from "./dto/update-leave-type.dto";

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectRepository(LeaveType)
    private leaveTypeRepository: Repository<LeaveType>,
  ) {}

  async create(createDto: CreateLeaveTypeDto) {
    const leaveType = this.leaveTypeRepository.create({
      ...createDto,
    });
    return this.leaveTypeRepository.save(leaveType);
  }

  async findAll() {
    return this.leaveTypeRepository.find({
      where: {},
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async findOne(id: string) {
    const leaveType = await this.leaveTypeRepository.findOne({
      where: { id },
    });

    if (!leaveType) {
      throw new NotFoundException("Leave type not found");
    }

    return leaveType;
  }

  async update(id: string, updateDto: UpdateLeaveTypeDto) {
    await this.findOne(id);
    await this.leaveTypeRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.leaveTypeRepository.delete({ id });
  }
}
