import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../common/entities/role.entity';
import { Permission } from '../../../common/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(businessId: string, createDto: CreateRoleDto) {
    // Check if role with same name exists
    const existing = await this.roleRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    const role = this.roleRepository.create({
      name: createDto.name,
      displayName: createDto.displayName,
      description: createDto.description,
    });

    if (createDto.permissionIds && createDto.permissionIds.length > 0) {
      const { In } = await import('typeorm');
      const permissions = await this.permissionRepository.find({
        where: { id: In(createDto.permissionIds) },
      });
      role.permissions = permissions;
    }

    return await this.roleRepository.save(role);
  }

  async findAll(businessId: string) {
    // Get all roles that are assigned to users in this restaurant
    // This ensures multi-tenant isolation - users only see roles used in their restaurant
    const rolesWithUsers = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('role.users', 'users')
      .where('users.businessId = :businessId', { businessId })
      .orderBy('role.createdAt', 'DESC')
      .getMany();

    // Also get roles that have no users yet (for display when creating new roles)
    // But only if this is needed for the UI
    return rolesWithUsers;
  }

  async findOne(id: string, businessId: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, businessId: string, updateDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (updateDto.name && updateDto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: updateDto.name },
      });

      if (existing) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    Object.assign(role, {
      name: updateDto.name ?? role.name,
      displayName: updateDto.displayName ?? role.displayName,
      description: updateDto.description ?? role.description,
    });

    if (updateDto.permissionIds !== undefined) {
      if (updateDto.permissionIds.length > 0) {
        const { In } = await import('typeorm');
        const permissions = await this.permissionRepository.find({
          where: { id: In(updateDto.permissionIds) },
        });
        role.permissions = permissions;
      } else {
        role.permissions = [];
      }
    }

    return await this.roleRepository.save(role);
  }

  async remove(id: string, businessId: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.users && role.users.length > 0) {
      throw new ConflictException('Cannot delete role that is assigned to users');
    }

    await this.roleRepository.remove(role);
  }
}

