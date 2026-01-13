import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../common/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll() {
    return this.userRepository.find({
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });
  }

  async findAllByRestaurant(businessId: string) {
    return this.userRepository.find({
      where: { businessId },
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });
  }

  async create(businessId: string, body: { name: string; email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = this.userRepository.create({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      businessId,
    });
    return await this.userRepository.save(user);
  }

  async findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });
  }
}
