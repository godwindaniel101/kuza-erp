import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from '../../../common/entities/invitation.entity';
import { User } from '../../../common/entities/user.entity';
import { Role } from '../../../common/entities/role.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private notificationsService: NotificationsService,
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(businessId: string, invitedById: string, createDto: CreateInvitationDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: createDto.email,
        acceptedAt: null as any,
      },
    });

    if (existingInvitation && new Date(existingInvitation.expiresAt) > new Date()) {
      throw new ConflictException('An invitation has already been sent to this email');
    }

    // Generate token
    let token: string;
    let tokenExists = true;
    while (tokenExists) {
      token = this.generateToken();
      const existing = await this.invitationRepository.findOne({ where: { token } });
      tokenExists = !!existing;
    }

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      email: createDto.email,
      token,
      roleId: createDto.roleId || null,
      invitedById,
      type: createDto.type || 'user',
      expiresAt,
      businessId,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Load relations
    const invitationWithRelations = await this.invitationRepository.findOne({
      where: { id: savedInvitation.id },
      relations: ['role', 'inviter'],
    });

    // Send invitation email
    await this.notificationsService.sendInvitation(invitationWithRelations);

    return invitationWithRelations;
  }

  async findAll(businessId: string) {
    return await this.invitationRepository.find({
      where: { businessId },
      relations: ['role', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id, businessId },
      relations: ['role', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  async findByToken(token: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['role', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  async resend(id: string, businessId: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id, businessId },
      relations: ['role', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    // Extend expiration if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      invitation.expiresAt = expiresAt;
      await this.invitationRepository.save(invitation);
    }

    // Resend email
    await this.notificationsService.sendInvitation(invitation);

    return invitation;
  }

  async remove(id: string, businessId: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id, businessId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Cannot delete an accepted invitation');
    }

    await this.invitationRepository.remove(invitation);
  }

  async accept(token: string, password: string) {
    const invitation = await this.findByToken(token);

    // Create user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      name: invitation.email?.split('@')[0] || 'New User',
      email: invitation.email,
      password: hashedPassword,
      businessId: invitation.businessId,
    });

    const savedUser = await this.userRepository.save(user);

  // Assign role if specified
    if (invitation.roleId) {
      const role = await this.roleRepository.findOne({ where: { id: invitation.roleId } });
      if (role) {
        savedUser.roles = [role];
        await this.userRepository.save(savedUser);
      }
    }

    // Mark invitation as accepted
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    return savedUser;
  }
}

