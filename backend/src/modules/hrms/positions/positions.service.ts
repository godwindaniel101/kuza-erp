import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../entities/position.entity';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

  async create(businessId: string, createDto: CreatePositionDto) {
    const position = this.positionRepository.create({
      ...createDto,
      businessId,
    });
    return this.positionRepository.save(position);
  }

  async findAll(businessId: string, departmentId?: string) {
    const where: any = { businessId };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    return this.positionRepository.find({
      where,
      relations: ['department'],
      order: { title: 'ASC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const position = await this.positionRepository.findOne({
      where: { id, businessId },
      relations: ['department'],
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    return position;
  }

  async update(id: string, businessId: string, updateDto: UpdatePositionDto) {
    await this.findOne(id, businessId);
    await this.positionRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.positionRepository.delete({ id });
  }
}

