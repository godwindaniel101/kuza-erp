import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../common/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { InvitationsService } from '../settings/invitations/invitations.service';

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
}
