import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Position } from "../entities/position.entity";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

  async create(createDto: CreatePositionDto) {
    const position = this.positionRepository.create({
      ...createDto,
    });
    return this.positionRepository.save(position);
  }

  async findAll(departmentId?: string) {
    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    return this.positionRepository.find({
      where,
      relations: ["department"],
      order: { title: "ASC" },
    });
  }

  async findOne(id: string) {
    const position = await this.positionRepository.findOne({
      where: { id },
      relations: ["department"],
    });

    if (!position) {
      throw new NotFoundException("Position not found");
    }

    return position;
  }

  async update(id: string, updateDto: UpdatePositionDto) {
    await this.findOne(id);
    await this.positionRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.positionRepository.delete({ id });
  }
}
