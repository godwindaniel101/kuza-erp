import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../../common/entities/user.entity";
import { Business } from "../../common/entities/business.entity";
import { Role } from "../../common/entities/role.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { BranchesService } from "../settings/branches/branches.service";
import { UomsService } from "../ims/uoms/uoms.service";
import { UomConversionsService } from "../ims/uom-conversions/uom-conversions.service";
import { LandlordService } from "../../common/landlord/services/landlord.service";
import { TenantMigrationService } from "../../common/tenant/tenant-migration.service";
import { TenantConnectionService } from "../../common/tenant/tenant-connection.service";
import {
  expandDependencies,
  normalizeBusinessType,
  presetForBusinessType,
} from "../../common/apps/app-registry";
import { currencyForCountry } from "../../common/apps/country-currency";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private branchesService: BranchesService,
    private uomsService: UomsService,
    private uomConversionsService: UomConversionsService,
    private landlordService: LandlordService,
    private tenantMigrationService: TenantMigrationService,
    private tenantConnectionService: TenantConnectionService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, businessName, businessType } = registerDto;

    // Check if user already exists in landlord database
    const existingLandlordUser =
      await this.landlordService.findUserByEmail(email);
    if (existingLandlordUser) {
      throw new ConflictException("User already exists");
    }

    // Generate slug from business name
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    try {
      // Step 1: Create tenant in landlord database (this creates the tenant schema)
      const tenant = await this.landlordService.createTenant(
        businessName,
        slug,
      );
      console.log(
        `✅ Created tenant: ${tenant.name} with schema: ${tenant.schemaName}`,
      );

      // Step 2: Create landlord user for authentication
      const landlordUser = await this.landlordService.createLandlordUser(
        name,
        email,
        password,
        tenant.id,
      );
      console.log(`✅ Created landlord user: ${landlordUser.email}`);

      // Step 3: Initialize tenant schema with tables
      await this.tenantMigrationService.initializeTenantSchema(
        tenant.schemaName,
      );
      console.log(`✅ Initialized tenant schema: ${tenant.schemaName}`);

      // Step 4: Switch to tenant schema and create tenant-specific data
      await this.tenantConnectionService.switchToTenantSchema(
        tenant.schemaName,
      );
      console.log(`✅ Switched to tenant schema: ${tenant.schemaName}`);

      // Normalize legacy businessType values ('restaurant', 'services',
      // 'general') to their canonical edition at write time — only the
      // canonical value is stored (docs/APPS-MODEL.md §2).
      const canonicalBusinessType = normalizeBusinessType(businessType);
      // Create business in tenant database. enabledApps: the caller's
      // explicit choice (or the edition preset), expanded to include
      // every app dependency (see docs/APPS-MODEL.md §2, §6).
      const enabledApps = expandDependencies(
        registerDto.enabledApps ??
          presetForBusinessType(canonicalBusinessType),
      );
      // Local-first pricing: the registration country sets the currency all
      // plans and prices are shown/billed in (docs/GTM.md §0).
      const country = registerDto.country?.toUpperCase() || null;
      const business = this.businessRepository.create({
        name: businessName,
        slug: slug,
        country,
        currency: country
          ? currencyForCountry(country)
          : tenant.currency || "NGN",
        businessType: canonicalBusinessType,
        enabledApps,
      });
      const savedBusiness = await this.businessRepository.save(business);
      console.log(
        `✅ Created business in tenant schema: ${savedBusiness.name}`,
      );

      // Create admin user in tenant database
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = this.userRepository.create({
        name,
        email,
        password: hashedPassword,
        landlordUserId: landlordUser.id, // Link to landlord user
      });
      const savedUser = await this.userRepository.save(user);
      console.log(`✅ Created tenant user: ${savedUser.email}`);

      // Create admin role with all permissions in tenant database
      let adminRole = await this.roleRepository.findOne({
        where: { name: "admin" },
        relations: ["permissions"],
      });

      if (!adminRole) {
        adminRole = this.roleRepository.create({
          name: "admin",
          displayName: "Administrator",
          description: "Full system access",
        });
        adminRole = await this.roleRepository.save(adminRole);
        console.log(`✅ Created admin role in tenant schema`);
      }

      // Assign admin role to user
      savedUser.roles = [adminRole];
      await this.userRepository.save(savedUser);

      // Step 5: Initialize default data for new tenant
      try {
        // Create default branch
        await this.createDefaultBranch(savedBusiness.id);
        console.log(`✅ Created default branch for tenant`);

        // Initialize default UOMs and conversions
        await this.createDefaultUoms(savedBusiness.id);
        console.log(`✅ Initialized default UOMs and conversions for tenant`);
      } catch (error) {
        console.warn(
          `⚠️  Warning: Failed to initialize some default data:`,
          error,
        );
        // Don't fail registration if default data creation fails
      }

      // Step 6: Get complete user data with relations (similar to login)
      const completeUser = await this.userRepository.findOne({
        where: { id: savedUser.id },
        relations: ["roles", "roles.permissions", "business", "employee"],
      });

      // Step 7: Generate JWT token with tenant information
      const payload = {
        email: landlordUser.email,
        sub: landlordUser.id,
        tenantId: tenant.id, // Use tenantId consistently
        // Platform super-admin claim (server-side authority for /admin). A newly
        // registered owner is never a super-admin; kept explicit for consistency.
        isSuperAdmin: landlordUser.isSuperAdmin === true,
      };
      const token = this.jwtService.sign(payload);

      // Step 8: Map user to safe format (like in login) + expose super-admin flag
      const safeUser = { ...this.mapUser(completeUser), isSuperAdmin: landlordUser.isSuperAdmin === true };

      // Step 9: Reset schema to default for future requests
      await this.tenantConnectionService.resetSchema();
      console.log(
        `✅ Registration completed successfully for tenant: ${tenant.name}`,
      );

      return {
        user: {
          ...safeUser,
          tenantId: tenant.id,
        },
        token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          schemaName: tenant.schemaName,
        },
      };
    } catch (error) {
      console.error(`❌ Registration failed for ${email}:`, error);

      // Reset schema in case of error
      try {
        await this.tenantConnectionService.resetSchema();
      } catch (resetError) {
        console.error("Failed to reset schema after error:", resetError);
      }

      throw new ConflictException(`Registration failed: ${error.message}`);
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      // Step 1: Find user in landlord database
      const landlordUser = await this.landlordService.findUserByEmail(email);
      if (!landlordUser) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Step 2: Verify password
      const isValid = await this.landlordService.verifyPassword(
        landlordUser,
        password,
      );
      if (!isValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Step 3: Get tenant information
      const tenant = await this.landlordService.findTenantById(
        landlordUser.tenantId,
      );
      if (!tenant.isActive) {
        throw new UnauthorizedException("Tenant account is not active");
      }

      // Step 4: Switch to tenant schema
      await this.tenantConnectionService.switchToTenantSchema(
        tenant.schemaName,
      );

      // Step 5: Find user in tenant database by landlordUserId instead of email
      const user = await this.userRepository.findOne({
        where: { landlordUserId: landlordUser.id },
        relations: ["roles", "roles.permissions", "business", "employee"],
      });

      if (!user) {
        // Reset schema and throw error
        await this.tenantConnectionService.resetSchema();
        throw new UnauthorizedException("User not found in tenant database");
      }

      // Step 6: Generate JWT token with tenant information
      const payload = {
        email: landlordUser.email,
        sub: landlordUser.id,
        tenantId: tenant.id, // Use tenantId consistently
        // Platform super-admin claim — signed into the JWT so SuperAdminGuard
        // can authorize /admin without trusting the client. Sourced from the
        // landlord user record (seeded from SUPER_ADMIN_EMAIL).
        isSuperAdmin: landlordUser.isSuperAdmin === true,
      };
      const token = this.jwtService.sign(payload);

      // Step 7: Map user to safe format + expose super-admin flag
      const safeUser = { ...this.mapUser(user), isSuperAdmin: landlordUser.isSuperAdmin === true };

      // Step 8: Reset schema
      await this.tenantConnectionService.resetSchema();

      return {
        user: {
          ...safeUser,
          tenantId: tenant.id,
        },
        token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          schemaName: tenant.schemaName,
        },
      };
    } catch (error) {
      // Reset schema in case of error
      try {
        await this.tenantConnectionService.resetSchema();
      } catch (resetError) {
        console.error("Failed to reset schema after error:", resetError);
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error(`Login failed for ${email}:`, error);
      throw new UnauthorizedException("Login failed");
    }
  }

  async validateUser(
    landlordUserId: string,
    includeFullUserData: boolean = false,
  ) {
    // This method is called by JwtStrategy to validate JWT tokens
    // It should work with landlord user IDs since that's what we put in JWT
    const landlordUser =
      await this.landlordService.findUserById(landlordUserId);

    if (!landlordUser || !landlordUser.isActive) {
      return null;
    }

    // Get tenant information
    const tenant = await this.landlordService.findTenantById(
      landlordUser.tenantId,
    );
    if (!tenant.isActive) {
      return null;
    }

    // If full user data is not requested, return basic info (for JWT validation)
    if (!includeFullUserData) {
      return {
        id: landlordUser.id,
        email: landlordUser.email,
        name: landlordUser.name,
        tenantId: tenant.id,
        tenant: tenant,
      };
    }

    // For /auth/me endpoint, return complete user data from tenant database
    try {
      // Switch to tenant schema to get complete user data
      await this.tenantConnectionService.switchToTenantSchema(
        tenant.schemaName,
      );

      // Find user in tenant database with all relations by landlordUserId
      const tenantUser = await this.userRepository.findOne({
        where: { landlordUserId: landlordUser.id },
        relations: ["roles", "roles.permissions", "business", "employee"],
      });

      if (!tenantUser) {
        // Reset schema and return basic info
        await this.tenantConnectionService.resetSchema();
        return {
          id: landlordUser.id,
          email: landlordUser.email,
          name: landlordUser.name,
          tenantId: tenant.id,
          tenant: tenant,
        };
      }

      // Map tenant user to safe format with complete data
      const completeUserData = this.mapUser(tenantUser);

      // Reset schema
      await this.tenantConnectionService.resetSchema();

      return {
        id: landlordUser.id, // Keep landlord ID for JWT consistency
        email: landlordUser.email,
        name: landlordUser.name,
        tenantId: tenant.id,
        tenant: tenant,
        // Include tenant-specific user data
        ...completeUserData,
        // Ensure we have the landlord ID for JWT operations
        landlordUserId: landlordUser.id,
      };
    } catch (error) {
      // Reset schema in case of error
      try {
        await this.tenantConnectionService.resetSchema();
      } catch (resetError) {
        console.error("Failed to reset schema after error:", resetError);
      }

      console.error("Error getting complete user data:", error);
      // Return basic info on error
      return {
        id: landlordUser.id,
        email: landlordUser.email,
        name: landlordUser.name,
        tenantId: tenant.id,
        tenant: tenant,
      };
    }
  }

  async validateGoogleUser(googleId: string, email: string, name: string) {
    let user = await this.userRepository.findOne({
      where: { googleId },
      relations: ["roles", "roles.permissions", "business", "employee"],
    });

    if (!user) {
      // Check if user exists by email
      user = await this.userRepository.findOne({
        where: { email },
        relations: ["roles", "roles.permissions", "business", "employee"],
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
          password: "", // No password for Google users
        });
        user = await this.userRepository.save(user);
      }
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Map a full User entity (with relations) to a safe, flattened shape
   * expected by the frontend: roles: string[], permissions: string[]
   */
  private mapUser(user: User) {
    const roles = Array.isArray(user.roles)
      ? user.roles.map((r) => r.name)
      : [];
    const permissions = Array.from(
      new Set(
        (user.roles || []).flatMap((r) =>
          (r.permissions || []).map((p) => p.name),
        ),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
    } as any;
  }

  private async createDefaultBranch(businessId: string) {
    try {
      // Get business name to use as branch name - in multi-tenant, get specific business
      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });
      const branchName = business?.name ? `${business.name} - Main Branch` : "Main Branch";

      await this.branchesService.create({
        name: branchName,
        address: "",
        phone: "",
        isDefault: true,
        isActive: true,
      });
    } catch (error) {
      console.error("Failed to create default branch:", error);
    }
  }

  private async createDefaultUoms(businessId: string) {
    // Match Laravel's UomSeeder exactly
    const defaultUoms = [
      { name: "piece", abbreviation: "pc", isDefault: true },
      { name: "pack", abbreviation: undefined, isDefault: true },
      { name: "box", abbreviation: undefined, isDefault: true },
      { name: "bottle", abbreviation: undefined, isDefault: true },
      { name: "crate", abbreviation: undefined, isDefault: true },
      { name: "kg", abbreviation: "kg", isDefault: true },
      { name: "g", abbreviation: "g", isDefault: true },
      { name: "L", abbreviation: "L", isDefault: true },
      { name: "mL", abbreviation: "mL", isDefault: true },
    ];

    // Match Laravel's conversion pairs exactly
    // Note: Laravel uses lowercase keys in pairs array ('l', 'ml') but UOM names are 'L' and 'mL'
    // UomConversionsService.create already creates bidirectional conversions
    const defaultConversions = [
      { fromName: "crate", toName: "piece", factor: 10.0 }, // 1 crate = 10 piece
      { fromName: "kg", toName: "g", factor: 1000.0 }, // 1 kg = 1000 g
      { fromName: "l", toName: "ml", factor: 1000.0 }, // 1 L = 1000 mL (lowercase keys to match Laravel's pairs array)
    ];

    try {
      // Create a map to store created UOMs by lowercase name
      const uomsByName: Record<string, any> = {};

      // Create all UOMs (check if they already exist first to avoid duplicates)
      for (const uomData of defaultUoms) {
        try {
          // Check if UOM already exists in this tenant
          const existing = await this.uomsService.findAll();
          const found = existing.find(
            (u) => u.name.toLowerCase() === uomData.name.toLowerCase(),
          );

          if (found) {
            uomsByName[uomData.name.toLowerCase()] = found;
          } else {
            const created = await this.uomsService.create({
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
            // Check if conversion already exists in this tenant
            const existingConversions =
              await this.uomConversionsService.findAll();
            const conversionExists = existingConversions.some(
              (c) =>
                (c.fromUomId === fromUom.id && c.toUomId === toUom.id) ||
                (c.fromUomId === toUom.id && c.toUomId === fromUom.id),
            );

            if (!conversionExists) {
              await this.uomConversionsService.create({
                fromUomId: fromUom.id,
                toUomId: toUom.id,
                factor: conv.factor,
              });
            }
          } catch (err) {
            // Conversion might already exist, ignore duplicate errors
            if (
              !err.message?.includes("already exists") &&
              !err.message?.includes("Conflict")
            ) {
              console.error(
                `Failed to create conversion ${conv.fromName} -> ${conv.toName}:`,
                err,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to create default UOMs:", error);
    }
  }

  // Public method to generate JWT tokens (for Google OAuth callback)
  generateToken(
    userId: string,
    email: string,
    tenantId: string,
    isSuperAdmin = false,
  ): string {
    const payload = {
      email,
      sub: userId,
      tenantId,
      isSuperAdmin: isSuperAdmin === true,
    };
    return this.jwtService.sign(payload);
  }
}
