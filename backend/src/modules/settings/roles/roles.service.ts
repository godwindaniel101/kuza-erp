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

  async create(createDto: CreateRoleDto) {
    // Check if role with same name exists in this tenant
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

  async findAll() {
    // Get all roles in this tenant database
    const roles = await this.roleRepository.find({
      relations: ['permissions', 'users'],
      order: { createdAt: 'DESC' },
    });

    return roles;
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, updateDto: UpdateRoleDto) {
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

  async remove(id: string) {
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

