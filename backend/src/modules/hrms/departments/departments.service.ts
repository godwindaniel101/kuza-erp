import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department } from "../entities/department.entity";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async create(createDto: CreateDepartmentDto) {
    // Validate parent department if provided
    if (createDto.parentId) {
      const parent = await this.departmentRepository.findOne({
        where: { id: createDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException("Parent department not found");
      }
    }

    const department = this.departmentRepository.create(createDto);
    return this.departmentRepository.save(department);
  }

  async findAll() {
    return this.departmentRepository.find({
      relations: ["positions"],
      order: { name: "ASC" },
    });
  }

  async findOne(id: string) {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ["positions"],
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  async update(id: string, updateDto: UpdateDepartmentDto) {
    await this.findOne(id);
    await this.departmentRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.departmentRepository.delete({ id });
  }
}
