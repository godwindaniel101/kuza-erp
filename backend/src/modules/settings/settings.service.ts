import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../common/entities/restaurant.entity';
import { Permission } from '../../common/entities/permission.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async getSettings(businessId: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: businessId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return {
      name: restaurant.name,
      description: restaurant.description,
      logo: restaurant.logo,
      primaryColor: restaurant.primaryColor,
      secondaryColor: restaurant.secondaryColor,
      currency: restaurant.currency || 'NGN',
      language: restaurant.language || 'en',
    };
  }

  async updateSettings(businessId: string, updateDto: UpdateSettingsDto) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: businessId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    Object.assign(restaurant, {
      name: updateDto.name ?? restaurant.name,
      description: updateDto.description ?? restaurant.description,
      logo: updateDto.logo ?? restaurant.logo,
      primaryColor: updateDto.primaryColor ?? restaurant.primaryColor,
      secondaryColor: updateDto.secondaryColor ?? restaurant.secondaryColor,
      currency: updateDto.currency ?? restaurant.currency,
      language: updateDto.language ?? restaurant.language,
    });

    return await this.restaurantRepository.save(restaurant);
  }

  async getAllPermissions() {
    return await this.permissionRepository.find({
      order: { group: 'ASC', displayName: 'ASC' },
    });
  }
}

