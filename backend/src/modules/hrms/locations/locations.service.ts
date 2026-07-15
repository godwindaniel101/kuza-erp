import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Location } from "../entities/location.entity";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(createDto: CreateLocationDto) {
    const location = this.locationRepository.create({
      ...createDto,
    });
    return this.locationRepository.save(location);
  }

  async findAll() {
    return this.locationRepository.find({
      where: {},
      order: { name: "ASC" },
    });
  }

  async findOne(id: string) {
    const location = await this.locationRepository.findOne({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    return location;
  }

  async update(id: string, updateDto: UpdateLocationDto) {
    await this.findOne(id);
    await this.locationRepository.update({ id }, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.locationRepository.delete({ id });
  }
}
