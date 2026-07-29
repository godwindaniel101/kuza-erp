import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Invitation } from "../../../common/entities/invitation.entity";
import { User } from "../../../common/entities/user.entity";
import { Role } from "../../../common/entities/role.entity";
import { Employee } from "../../hrms/entities/employee.entity";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { NotificationsService } from "../../notifications/notifications.service";
import { LandlordService } from "../../../common/landlord/services/landlord.service";
import { TenantConnectionService } from "../../../common/tenant/tenant-connection.service";
import * as crypto from "crypto";

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private notificationsService: NotificationsService,
    private landlordService: LandlordService,
    private tenantConnectionService: TenantConnectionService,
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async create(invitedById: string, tenantId: string, createDto: CreateInvitationDto) {
    // Check if user already exists in this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Check if there's already a pending invitation in this tenant
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: createDto.email,
        acceptedAt: null as any,
      },
    });

    if (
      existingInvitation &&
      new Date(existingInvitation.expiresAt) > new Date()
    ) {
      throw new ConflictException(
        "An invitation has already been sent to this email",
      );
    }

    // Generate token
    let token: string;
    let tokenExists = true;
    while (tokenExists) {
      token = this.generateToken();
      const existing = await this.invitationRepository.findOne({
        where: { token },
      });
      tokenExists = !!existing;
    }

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      email: createDto.email,
      token,
      tenantId, // Store tenant ID for later schema identification
      roleId: createDto.roleId || null,
      invitedById,
      type: createDto.type || "user",
      expiresAt,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Load relations
    const invitationWithRelations = await this.invitationRepository.findOne({
      where: { id: savedInvitation.id },
      relations: ["role", "inviter"],
    });

    // Send invitation email
    await this.notificationsService.sendInvitation(invitationWithRelations);

    return invitationWithRelations;
  }

  async findAll() {
    return await this.invitationRepository.find({
      relations: ["role", "inviter"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
      relations: ["role", "inviter"],
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    return invitation;
  }

  async findByToken(token: string) {
    // This method should be called globally, not from within a tenant context
    // First, we need to find which tenant this invitation belongs to
    
    // Note: This requires a different approach - either:
    // 1. Store invitations in landlord database with tenant reference
    // 2. Or search through all tenant databases (less efficient)
    
    // For now, let's assume we're in the correct tenant context
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ["role", "inviter"],
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("Invitation has already been accepted");
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new BadRequestException("Invitation has expired");
    }

    return invitation;
  }

  /**
   * Global method to find invitation by token across all tenants
   * This should be called from a global context (not tenant-specific)
   */
  async findByTokenGlobal(token: string) {
    // Get all tenants from landlord database
    const tenants = await this.landlordService.getAllTenants();
    
    for (const tenant of tenants) {
      try {
        // Switch to tenant schema
        await this.tenantConnectionService.switchToTenantSchema(tenant.schemaName);
        
        // Try to find invitation in this tenant
        const invitation = await this.invitationRepository.findOne({
          where: { token },
          relations: ["role", "inviter"],
        });

        if (invitation) {
          // Found it! Return invitation with tenant info
          await this.tenantConnectionService.resetSchema();
          return {
            ...invitation,
            tenantId: tenant.id,
            tenantSchemaName: tenant.schemaName,
          };
        }
      } catch (error) {
        console.error(`Error searching tenant ${tenant.schemaName}:`, error);
        continue;
      }
    }

    // Reset schema and return not found
    await this.tenantConnectionService.resetSchema();
    throw new NotFoundException("Invitation not found");
  }

  async resend(id: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
      relations: ["role", "inviter"],
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("Invitation has already been accepted");
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

  async remove(id: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("Cannot delete an accepted invitation");
    }

    await this.invitationRepository.remove(invitation);
  }

  async accept(token: string, password: string, name?: string) {
    // Find invitation globally across all tenants
    const invitationWithTenant = await this.findByTokenGlobal(token);

    // Resolve the display name: prefer the name captured at acceptance,
    // falling back to the local-part of the email so the user is never
    // left with an empty name.
    const resolvedName =
      name?.trim() || invitationWithTenant.email?.split("@")[0] || "New User";

    try {
      // Step 1: Create landlord user first (for authentication)
      const landlordUser = await this.landlordService.createLandlordUserFromInvitation(
        resolvedName,
        invitationWithTenant.email,
        password,
        invitationWithTenant.tenantId,
      );

      // Step 2: Switch to the correct tenant schema
      await this.tenantConnectionService.switchToTenantSchema(invitationWithTenant.tenantSchemaName);
      
      // Validate invitation is still valid
      if (invitationWithTenant.acceptedAt) {
        throw new BadRequestException("Invitation has already been accepted");
      }

      if (new Date(invitationWithTenant.expiresAt) < new Date()) {
        throw new BadRequestException("Invitation has expired");
      }

      // Step 3: Create user in the correct tenant database with landlord link
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = this.userRepository.create({
        name: resolvedName,
        email: invitationWithTenant.email,
        password: hashedPassword,
        landlordUserId: landlordUser.id, // Link to landlord user
      });

      const savedUser = await this.userRepository.save(user);

      // Step 4: Assign role if specified
      if (invitationWithTenant.roleId) {
        const role = await this.roleRepository.findOne({
          where: { id: invitationWithTenant.roleId },
        });
        if (role) {
          savedUser.roles = [role];
          await this.userRepository.save(savedUser);
        }
      }

      // Step 5: For employee invitations, link the new tenant user to the
      // matching Employee record (by email) in the tenant schema. If no
      // employee matches, or one is already linked, skip gracefully.
      if (invitationWithTenant.type === "employee") {
        const employee = await this.employeeRepository.findOne({
          where: { email: invitationWithTenant.email },
        });
        if (employee && !employee.userId) {
          employee.userId = savedUser.id;
          await this.employeeRepository.save(employee);
        }
      }

      // Step 6: Mark invitation as accepted
      const invitation = await this.invitationRepository.findOne({
        where: { token },
      });
      if (invitation) {
        invitation.acceptedAt = new Date();
        await this.invitationRepository.save(invitation);
      }

      // Step 7: Reset schema before returning
      await this.tenantConnectionService.resetSchema();

      // Step 8: Send a welcome email (best-effort — never block onboarding).
      // NotificationsService swallows its own send errors and returns a result.
      await this.notificationsService.sendWelcomeEmail(
        invitationWithTenant.email,
        resolvedName,
      );

      return {
        user: {
          ...savedUser,
          landlordUserId: landlordUser.id,
        },
        landlordUser,
        tenantId: invitationWithTenant.tenantId,
      };
      
    } catch (error) {
      // Always reset schema on error
      await this.tenantConnectionService.resetSchema();
      throw error;
    }
  }
}
