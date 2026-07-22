import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../common/entities/user.entity';
import { Role } from '../../common/entities/role.entity';
import * as bcrypt from 'bcryptjs';
import { InvitationsService } from '../settings/invitations/invitations.service';
import { UpdateUserDto } from './dto/update-user.dto';

const ADMIN_ROLE_NAME = 'admin';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private invitationsService: InvitationsService,
  ) {}

  async findAll() {
    return this.userRepository.find({
      relations: ['roles', 'roles.permissions', 'business', 'employee'],
    });
  }

  async findAllByBusiness(businessId: string) {
    return this.userRepository.find({
      where: { businessId },
      relations: ['roles', 'roles.permissions', 'business', 'employee'],
    });
  }

  /**
   * Create user through invitation flow (recommended approach)
   */
  async createWithInvitation(
    invitedById: string, 
    tenantId: string, 
    body: { name?: string; email: string; roleId?: string }
  ) {
    try {
      // Send invitation
      const invitation = await this.invitationsService.create(invitedById, tenantId, {
        email: body.email,
        type: 'user',
        roleId: body.roleId,
      });

      return {
        invitation,
        message: 'User invitation sent successfully. User can set up their account using the invitation email.',
      };
    } catch (error) {
      if (error.message?.includes('already exists')) {
        throw new BadRequestException('User with this email already exists or has pending invitation');
      }
      throw error;
    }
  }

  /**
   * Legacy direct user creation (not recommended - bypasses invitation flow)
   * Only use for system/admin purposes where invitation flow is not suitable
   */
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

  async findOne(id: string, businessId?: string) {
    const where: any = { id };
    
    // Add businessId filter if provided (for tenant isolation)
    if (businessId) {
      where.businessId = businessId;
    }
    
    const user = await this.userRepository.findOne({
      where,
      relations: ['roles', 'roles.permissions', 'business', 'employee'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a tenant user: name, active status, and role assignments.
   * When `roleIds` is provided, the user's roles are REPLACED (M:N via user_roles)
   * with the resolved Role entities. Best-effort guard prevents demoting/deactivating
   * the last remaining active admin of the business.
   */
  async update(id: string, businessId: string, dto: UpdateUserDto) {
    const user = await this.findOne(id, businessId);

    const willDeactivate = dto.isActive === false && user.isActive;
    const willReplaceRoles = dto.roleIds !== undefined;

    // Resolve new roles up-front so we can reason about the resulting admin state.
    let nextRoles: Role[] | undefined;
    if (willReplaceRoles) {
      nextRoles = await this.resolveRoles(dto.roleIds as string[]);
    }

    const isCurrentlyAdmin = (user.roles || []).some(
      (r) => r.name === ADMIN_ROLE_NAME,
    );
    const willBeAdmin = willReplaceRoles
      ? (nextRoles as Role[]).some((r) => r.name === ADMIN_ROLE_NAME)
      : isCurrentlyAdmin;

    const losesAdmin =
      isCurrentlyAdmin && willReplaceRoles && !willBeAdmin;

    // Best-effort: don't strip the last active admin of its privileges.
    if (isCurrentlyAdmin && (willDeactivate || losesAdmin)) {
      const adminCount = await this.countActiveAdmins(businessId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove admin role from or deactivate the last active admin',
        );
      }
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }
    if (willReplaceRoles) {
      user.roles = nextRoles as Role[];
    }

    await this.userRepository.save(user);

    // Re-read with relations so the response carries fresh roles/permissions.
    return this.findOne(id, businessId);
  }

  /**
   * Hard-delete a tenant user row. Prevents self-deletion. Does NOT touch the
   * landlord auth record.
   */
  async remove(id: string, businessId: string, requesterLandlordUserId: string) {
    const user = await this.findOne(id, businessId);

    if (
      requesterLandlordUserId &&
      user.landlordUserId === requesterLandlordUserId
    ) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const isAdmin = (user.roles || []).some(
      (r) => r.name === ADMIN_ROLE_NAME,
    );
    if (isAdmin) {
      const adminCount = await this.countActiveAdmins(businessId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last active admin of the business',
        );
      }
    }

    await this.userRepository.remove(user);

    return { id, deleted: true };
  }

  private get roleRepository(): Repository<Role> {
    return this.userRepository.manager.getRepository(Role);
  }

  private async resolveRoles(roleIds: string[]): Promise<Role[]> {
    if (roleIds.length === 0) {
      return [];
    }
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
    });
    if (roles.length !== roleIds.length) {
      const found = new Set(roles.map((r) => r.id));
      const missing = roleIds.filter((rid) => !found.has(rid));
      throw new BadRequestException(
        `Unknown role id(s): ${missing.join(', ')}`,
      );
    }
    return roles;
  }

  private async countActiveAdmins(businessId: string): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.name = :roleName', {
        roleName: ADMIN_ROLE_NAME,
      })
      .where('user.businessId = :businessId', { businessId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount();
  }
}
