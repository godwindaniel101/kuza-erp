import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../common/entities/user.entity';
import { Restaurant } from '../../common/entities/restaurant.entity';
import { Role } from '../../common/entities/role.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { BranchesService } from '../settings/branches/branches.service';
import { UomsService } from '../ims/uoms/uoms.service';
import { UomConversionsService } from '../ims/uom-conversions/uom-conversions.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private branchesService: BranchesService,
    private uomsService: UomsService,
    private uomConversionsService: UomConversionsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, restaurantName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and optionally restaurant
    let businessId: string | undefined;
    if (restaurantName) {
      const restaurant = this.restaurantRepository.create({
        name: restaurantName,
        slug: restaurantName.toLowerCase().replace(/\s+/g, '-'),
      });
      const savedRestaurant = await this.restaurantRepository.save(restaurant);
      businessId = savedRestaurant.id;
    }

    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      businessId,
    });

    const savedUser = await this.userRepository.save(user);

    // Assign default admin role to new user (or create it if it doesn't exist)
    let adminRole = await this.roleRepository.findOne({
      where: { name: 'admin' },
      relations: ['permissions'],
    });

    if (!adminRole) {
      // Create admin role with all permissions (for now, we'll create it without permissions
      // In production, you'd want to seed permissions properly)
      adminRole = this.roleRepository.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
      });
      adminRole = await this.roleRepository.save(adminRole);
    }

    // Assign admin role to user
    savedUser.roles = [adminRole];
    await this.userRepository.save(savedUser);

    // Create default branch and UOMs for new restaurant
    if (businessId) {
      await this.createDefaultBranch(businessId);
      await this.createDefaultUoms(businessId);
    }

    // Load relations
    const userWithRelations = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });

    // Generate token
    const token = this.generateToken(
      savedUser.id,
      savedUser.email,
      businessId,
      userWithRelations?.employee?.id,
    );

    // Map user to a safe, flattened shape expected by frontend
    const safeUser = this.mapUser(userWithRelations);

    return {
      user: safeUser,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with relations
  let user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user has at least a default role to avoid empty roles array for legacy users
    if (!user.roles || user.roles.length === 0) {
      let adminRole = await this.roleRepository.findOne({
        where: { name: 'admin' },
        relations: ['permissions'],
      });

      if (!adminRole) {
        adminRole = this.roleRepository.create({
          name: 'admin',
          displayName: 'Administrator',
          description: 'Full system access',
        });
        adminRole = await this.roleRepository.save(adminRole);
      }

      user.roles = [adminRole];
      await this.userRepository.save(user);
      // Reload the user with relations to return fresh data
      user = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
      });
    }

    // Generate token
    const token = this.generateToken(
      user.id,
      user.email,
      user.businessId || undefined,
      user.employee?.id || undefined,
    );

    // Map user to a safe, flattened shape expected by frontend
    const safeUser = this.mapUser(user);

    return {
      user: safeUser,
      token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });

    if (!user) {
      return null;
    }

  return this.mapUser(user);
  }

  async validateGoogleUser(googleId: string, email: string, name: string) {
    let user = await this.userRepository.findOne({
      where: { googleId },
      relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
    });

    if (!user) {
      // Check if user exists by email
      user = await this.userRepository.findOne({
        where: { email },
        relations: ['roles', 'roles.permissions', 'restaurant', 'employee'],
      });

      if (user) {
        // Link Google account
        user.googleId = googleId;
        user.emailVerified = new Date();
        await this.userRepository.save(user);
      } else {
        // Create new user
        user = this.userRepository.create({
          name,
          email,
          googleId,
          emailVerified: new Date(),
          password: '', // No password for Google users
        });
        user = await this.userRepository.save(user);
      }
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  generateToken(
    userId: string,
    email: string,
    businessId?: string,
    employeeId?: string,
  ): string {
    const payload = {
      sub: userId,
      email,
      businessId,
      employeeId,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Map a full User entity (with relations) to a safe, flattened shape
   * expected by the frontend: roles: string[], permissions: string[]
   */
  private mapUser(user: User) {
    const roles = Array.isArray(user.roles) ? user.roles.map((r) => r.name) : [];
    const permissions = Array.from(
      new Set(
        (user.roles || []).flatMap((r) => (r.permissions || []).map((p) => p.name))
      )
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      businessId: (user as any).businessId ?? user?.restaurant?.id ?? null,
      roles,
      permissions,
    } as any;
  }

  private async createDefaultBranch(businessId: string) {
    try {
      // Get restaurant name to use as branch name
      const restaurant = await this.restaurantRepository.findOne({
        where: { id: businessId },
      });
      const branchName = restaurant?.name || 'Main Branch';
      
      await this.branchesService.create(businessId, {
        name: branchName,
        isDefault: true,
        isActive: true,
      });
    } catch (error) {
      console.error('Failed to create default branch:', error);
    }
  }

  private async createDefaultUoms(businessId: string) {
    // Match Laravel's UomSeeder exactly
    const defaultUoms = [
      { name: 'piece', abbreviation: 'pc', isDefault: true },
      { name: 'pack', abbreviation: undefined, isDefault: true },
      { name: 'box', abbreviation: undefined, isDefault: true },
      { name: 'bottle', abbreviation: undefined, isDefault: true },
      { name: 'crate', abbreviation: undefined, isDefault: true },
      { name: 'kg', abbreviation: 'kg', isDefault: true },
      { name: 'g', abbreviation: 'g', isDefault: true },
      { name: 'L', abbreviation: 'L', isDefault: true },
      { name: 'mL', abbreviation: 'mL', isDefault: true },
    ];

    // Match Laravel's conversion pairs exactly
    // Note: Laravel uses lowercase keys in pairs array ('l', 'ml') but UOM names are 'L' and 'mL'
    // UomConversionsService.create already creates bidirectional conversions
    const defaultConversions = [
      { fromName: 'crate', toName: 'piece', factor: 10.0 },    // 1 crate = 10 piece
      { fromName: 'kg', toName: 'g', factor: 1000.0 },         // 1 kg = 1000 g
      { fromName: 'l', toName: 'ml', factor: 1000.0 },         // 1 L = 1000 mL (lowercase keys to match Laravel's pairs array)
    ];

    try {
      // Create a map to store created UOMs by lowercase name
      const uomsByName: Record<string, any> = {};
      
      // Create all UOMs (check if they already exist first to avoid duplicates)
      for (const uomData of defaultUoms) {
        try {
          // Check if UOM already exists for this restaurant
          const existing = await this.uomsService.findAll(businessId);
          const found = existing.find(
            (u) => u.name.toLowerCase() === uomData.name.toLowerCase()
          );
          
          if (found) {
            uomsByName[uomData.name.toLowerCase()] = found;
          } else {
            const created = await this.uomsService.create(businessId, {
              name: uomData.name,
              abbreviation: uomData.abbreviation,
              isDefault: uomData.isDefault,
            });
            uomsByName[uomData.name.toLowerCase()] = created;
          }
        } catch (err) {
          console.error(`Failed to create UOM ${uomData.name}:`, err);
        }
      }

      // Create conversions (bidirectional conversion is handled by UomConversionsService.create)
      for (const conv of defaultConversions) {
        const fromUom = uomsByName[conv.fromName.toLowerCase()];
        const toUom = uomsByName[conv.toName.toLowerCase()];
        
        if (fromUom && toUom) {
          try {
            // Check if conversion already exists
            const existingConversions = await this.uomConversionsService.findAll(businessId);
            const conversionExists = existingConversions.some(
              (c) =>
                (c.fromUomId === fromUom.id && c.toUomId === toUom.id) ||
                (c.fromUomId === toUom.id && c.toUomId === fromUom.id)
            );

            if (!conversionExists) {
              await this.uomConversionsService.create(businessId, {
                fromUomId: fromUom.id,
                toUomId: toUom.id,
                factor: conv.factor,
              });
            }
          } catch (err) {
            // Conversion might already exist, ignore duplicate errors
            if (!err.message?.includes('already exists') && !err.message?.includes('Conflict')) {
              console.error(`Failed to create conversion ${conv.fromName} -> ${conv.toName}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to create default UOMs:', error);
    }
  }
}
