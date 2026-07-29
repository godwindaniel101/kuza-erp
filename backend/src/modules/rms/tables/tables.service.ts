import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Table } from "../entities/table.entity";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  async create(branchId: string, createDto: CreateTableDto) {
    const table = this.tableRepository.create({
      ...createDto,

      branchId,
    });
    return this.tableRepository.save(table);
  }

  async findAll(branchId?: string) {
    const where: any = {};
    if (branchId) {
      where.branchId = branchId;
    }
    return this.tableRepository.find({ where });
  }

  async findOne(id: string) {
    const table = await this.tableRepository.findOne({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    return table;
  }

  async update(id: string, updateDto: UpdateTableDto) {
    await this.findOne(id);
    await this.tableRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tableRepository.delete({ id });
  }
}
