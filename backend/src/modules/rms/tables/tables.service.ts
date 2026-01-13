import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from '../entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  async create(businessId: string, branchId: string, createDto: CreateTableDto) {
    const table = this.tableRepository.create({
      ...createDto,
      businessId,
      branchId,
    });
    return this.tableRepository.save(table);
  }

  async findAll(businessId: string, branchId?: string) {
    const where: any = { businessId };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.tableRepository.find({ where });
  }

  async findOne(id: string, businessId: string) {
    const table = await this.tableRepository.findOne({
      where: { id, businessId },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async update(id: string, businessId: string, updateDto: UpdateTableDto) {
    await this.findOne(id, businessId);
    await this.tableRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.tableRepository.delete({ id });
  }
}

