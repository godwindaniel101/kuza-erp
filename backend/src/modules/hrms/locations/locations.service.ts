import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(businessId: string, createDto: CreateLocationDto) {
    const location = this.locationRepository.create({
      ...createDto,
      businessId,
    });
    return this.locationRepository.save(location);
  }

  async findAll(businessId: string) {
    return this.locationRepository.find({
      where: { businessId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const location = await this.locationRepository.findOne({
      where: { id, businessId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async update(id: string, businessId: string, updateDto: UpdateLocationDto) {
    await this.findOne(id, businessId);
    await this.locationRepository.update({ id }, updateDto);
    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    await this.locationRepository.delete({ id });
  }
}

