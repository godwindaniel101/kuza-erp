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
import { LandlordUser } from "../../common/landlord/entities/landlord-user.entity";
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

  /**
   * Legacy single-shot registration: creates the landlord account AND its
   * business/tenant in one call. Kept for backward compatibility; the primary
   * flow is now email-first signup() → verifyEmail() → completeOnboarding().
   */
  async register(registerDto: RegisterDto) {
    const { name, email, password, businessName, businessType } = registerDto;

    if (!businessName) {
      throw new ConflictException("businessName is required");
    }

    // Check if user already exists in landlord database
    const existingLandlordUser =
      await this.landlordService.findUserByEmail(email);
    if (existingLandlordUser) {
      throw new ConflictException("User already exists");
    }

    // Create the landlord (auth) account first, business-less; provisioning
    // links it to the tenant it creates.
    const landlordUser = await this.landlordService.createLandlordUser(
      name,
      email,
      password,
      null,
    );

    const { tenant, completeUser } = await this.provisionTenant(landlordUser, {
      businessName,
      businessType,
      country: registerDto.country,
      enabledApps: registerDto.enabledApps,
      displayName: name,
    });

    const token = this.generateToken(
      landlordUser.id,
      landlordUser.email,
      tenant.id,
      landlordUser.isSuperAdmin === true,
    );
    const safeUser = {
      ...this.mapUser(completeUser),
      isSuperAdmin: landlordUser.isSuperAdmin === true,
    };

    return {
      user: { ...safeUser, tenantId: tenant.id },
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
      },
    };
  }

  /**
   * Provision a fresh tenant (schema + business + admin user/role + default
   * data) for an already-existing, business-less landlord user, and link the
   * landlord user to it. Shared by register() and completeOnboarding(); this is
   * the single source of truth for tenant creation, so the two paths cannot
   * drift. On any failure the shared search_path is reset before rethrowing.
   *
   * The tenant user's password column is seeded with the landlord user's
   * already-hashed password — login authenticates against the landlord record,
   * so the tenant copy is never checked, but the column stays non-empty.
   */
  private async provisionTenant(
    landlordUser: LandlordUser,
    opts: {
      businessName: string;
      businessType?: string;
      country?: string;
      enabledApps?: string[];
      displayName: string;
    },
  ) {
    const { businessName, businessType, country, enabledApps, displayName } =
      opts;

    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    try {
      // Step 1: Create tenant + its schema in the landlord database, then link
      // the landlord user to it (and record their display name).
      const tenant = await this.landlordService.createTenant(
        businessName,
        slug,
      );
      await this.landlordService.setUserTenant(
        landlordUser.id,
        tenant.id,
        displayName,
      );
      landlordUser.tenantId = tenant.id;
      landlordUser.name = displayName;

      // Step 2: Initialize tenant schema with tables.
      await this.tenantMigrationService.initializeTenantSchema(
        tenant.schemaName,
      );

      // Step 3: Switch to tenant schema and create tenant-specific data.
      await this.tenantConnectionService.switchToTenantSchema(
        tenant.schemaName,
      );

      // Normalize legacy businessType values ('restaurant', 'services',
      // 'general') to their canonical edition at write time — only the
      // canonical value is stored (docs/APPS-MODEL.md §2).
      const canonicalBusinessType = normalizeBusinessType(businessType);
      // enabledApps: the caller's explicit choice (or the edition preset),
      // expanded to include every app dependency (docs/APPS-MODEL.md §2, §6).
      const apps = expandDependencies(
        enabledApps ?? presetForBusinessType(canonicalBusinessType),
      );
      // Local-first pricing: the registration country sets the currency all
      // plans and prices are shown/billed in (docs/GTM.md §0).
      const c = country?.toUpperCase() || null;
      const business = this.businessRepository.create({
        name: businessName,
        slug: slug,
        country: c,
        currency: c ? currencyForCountry(c) : tenant.currency || "NGN",
        businessType: canonicalBusinessType,
        enabledApps: apps,
      });
      const savedBusiness = await this.businessRepository.save(business);

      // Create the admin user in the tenant database, linked to the landlord
      // user. Reuse the landlord user's already-hashed password (see doc above).
      const user = this.userRepository.create({
        name: displayName,
        email: landlordUser.email,
        password: landlordUser.password,
        landlordUserId: landlordUser.id,
      });
      const savedUser = await this.userRepository.save(user);

      // Create the admin role in the tenant database.
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
      }
      savedUser.roles = [adminRole];
      await this.userRepository.save(savedUser);

      // Initialize default data for the new tenant.
      try {
        await this.createDefaultBranch(savedBusiness.id);
        await this.createDefaultUoms(savedBusiness.id);
      } catch (error) {
        console.warn(
          `⚠️  Warning: Failed to initialize some default data:`,
          error,
        );
        // Don't fail provisioning if default data creation fails.
      }

      const completeUser = await this.userRepository.findOne({
        where: { id: savedUser.id },
        relations: ["roles", "roles.permissions", "business", "employee"],
      });

      // Reset schema to default for future requests.
      await this.tenantConnectionService.resetSchema();

      return { tenant, completeUser, savedUser };
    } catch (error) {
      console.error(
        `❌ Tenant provisioning failed for ${landlordUser.email}:`,
        error,
      );
      try {
        await this.tenantConnectionService.resetSchema();
      } catch (resetError) {
        console.error("Failed to reset schema after error:", resetError);
      }
      throw new ConflictException(`Provisioning failed: ${error.message}`);
    }
  }

  // ------------------------------------------------------------------
  // Phase B: email-first signup → verify → first-run onboarding
  // ------------------------------------------------------------------

  /**
   * Short-lived signed token emailed as a verification link. Carries only the
   * landlord user id; stateless (no DB column needed).
   */
  signEmailVerifyToken(landlordUserId: string): string {
    return this.jwtService.sign(
      { purpose: "email-verify", sub: landlordUserId },
      { expiresIn: "24h" },
    );
  }

  /**
   * Short-lived token proving the bearer just verified their email (or a new
   * Google identity), authorizing them to complete onboarding.
   */
  signOnboardingToken(landlordUserId: string): string {
    return this.jwtService.sign(
      { purpose: "onboarding", sub: landlordUserId },
      { expiresIn: "2h" },
    );
  }

  /**
   * Step 1 of email-first signup: create a business-less, unverified landlord
   * account and return a verification token to email. Idempotent for an
   * abandoned (unverified, business-less) signup — the password is refreshed
   * and a new link issued rather than erroring. A fully onboarded email is
   * rejected so it can't be silently overwritten.
   */
  async signup(email: string, password: string) {
    const existing = await this.landlordService.findUserByEmail(email);
    if (existing) {
      if (existing.tenantId) {
        throw new ConflictException(
          "An account with this email already exists. Please log in.",
        );
      }
      // Pending signup (verified or not) with no business yet → refresh the
      // password and re-issue a verification link.
      await this.landlordService.updateLandlordUserPassword(
        existing.id,
        password,
      );
      return {
        landlordUserId: existing.id,
        verifyToken: this.signEmailVerifyToken(existing.id),
      };
    }
    const user = await this.landlordService.createLandlordUser(
      email.split("@")[0],
      email,
      password,
      null,
    );
    return {
      landlordUserId: user.id,
      verifyToken: this.signEmailVerifyToken(user.id),
    };
  }

  /**
   * Step 2: verify the email link. Marks the account verified and, when it has
   * no business yet, returns an onboarding token to drive the first-run wizard.
   */
  async verifyEmail(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException(
        "Verification link is invalid or has expired.",
      );
    }
    if (payload?.purpose !== "email-verify") {
      throw new UnauthorizedException("Invalid verification token.");
    }
    const user = await this.landlordService.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Account not found.");
    }
    if (!user.emailVerified) {
      await this.landlordService.markEmailVerified(user.id);
    }
    const needsOnboarding = !user.tenantId;
    return {
      email: user.email,
      needsOnboarding,
      onboardingToken: needsOnboarding
        ? this.signOnboardingToken(user.id)
        : null,
    };
  }

  /**
   * Re-issue a verification link for an unverified account. Returns whether a
   * link was produced; the controller decides what to email (and never leaks
   * whether the address exists).
   */
  async resendVerification(email: string) {
    const user = await this.landlordService.findUserByEmail(email);
    if (!user || user.emailVerified) {
      return { sent: false as const, verifyToken: null };
    }
    return {
      sent: true as const,
      verifyToken: this.signEmailVerifyToken(user.id),
    };
  }

  /**
   * Step 3: first-run onboarding. Consumes either an `onboarding` token (from
   * verifyEmail, existing business-less landlord user) or a `google-onboarding`
   * token (brand-new Google user — the landlord account is created here). Then
   * provisions the tenant and returns a full session, exactly like login.
   */
  async completeOnboarding(dto: {
    token: string;
    businessName: string;
    businessType?: string;
    country?: string;
    enabledApps?: string[];
    name?: string;
  }) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new UnauthorizedException(
        "Onboarding session expired. Please sign in again.",
      );
    }

    let landlordUser: LandlordUser | null;
    if (payload?.purpose === "google-onboarding") {
      landlordUser = await this.landlordService.createGoogleUser(
        payload.name || dto.name || payload.email.split("@")[0],
        payload.email,
        payload.googleId,
      );
    } else if (payload?.purpose === "onboarding") {
      landlordUser = await this.landlordService.findUserById(payload.sub);
    } else {
      throw new UnauthorizedException("Invalid onboarding token.");
    }

    if (!landlordUser) {
      throw new UnauthorizedException("Account not found.");
    }
    if (landlordUser.tenantId) {
      throw new ConflictException("This account already has a business.");
    }
    if (!dto.businessName) {
      throw new ConflictException("businessName is required");
    }

    const displayName =
      dto.name || landlordUser.name || landlordUser.email.split("@")[0];
    const { tenant, completeUser } = await this.provisionTenant(landlordUser, {
      businessName: dto.businessName,
      businessType: dto.businessType,
      country: dto.country,
      enabledApps: dto.enabledApps,
      displayName,
    });

    const token = this.generateToken(
      landlordUser.id,
      landlordUser.email,
      tenant.id,
      landlordUser.isSuperAdmin === true,
    );
    const safeUser = {
      ...this.mapUser(completeUser),
      isSuperAdmin: landlordUser.isSuperAdmin === true,
    };

    return {
      user: { ...safeUser, tenantId: tenant.id },
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
      },
    };
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

      // Email-first signup gate: an account that hasn't verified its email
      // can't sign in yet. (Google/invite accounts are verified on creation.)
      // Password is already checked above, so this only ever tells the true
      // owner their own account is unverified. Returned as a 200 signal (not a
      // thrown 401) so the client can offer "resend link" — mirrors the
      // needsOnboarding branch below.
      if (!landlordUser.emailVerified) {
        return { needsVerification: true as const, email: landlordUser.email };
      }

      // Verified but business-less (signed up, never finished onboarding) →
      // hand back an onboarding token so the client resumes the wizard rather
      // than dropping into an app with no tenant.
      if (!landlordUser.tenantId) {
        return {
          needsOnboarding: true as const,
          onboardingToken: this.signOnboardingToken(landlordUser.id),
        };
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

    // A business-less (pending onboarding) account has no valid session — it
    // should only ever hold an onboarding token, never a full JWT.
    if (!landlordUser.tenantId) {
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

  /**
   * Google OAuth resolution — LANDLORD-model (the callback has no tenant
   * context). Matches an existing landlord account by email and links the
   * Google id on first use. A brand-new user has no landlord account yet
   * (landlord_users.tenantId is required), so we return an `isNew` marker; the
   * controller routes them into onboarding, which creates the tenant + account.
   */
  async validateGoogleUser(googleId: string, email: string, name: string) {
    const landlordUser = await this.landlordService.findUserByEmail(email);
    if (landlordUser) {
      if (landlordUser.googleId !== googleId) {
        await this.landlordService.linkGoogleId(landlordUser.id, googleId);
      }
      // Existing account but no business yet (email-first signup that never
      // finished onboarding) → route through onboarding, same as a brand-new
      // Google user. completeOnboarding's createGoogleUser is idempotent, so it
      // re-uses this very row rather than creating a duplicate.
      if (!landlordUser.tenantId) {
        return { isNew: true as const, email: landlordUser.email, name, googleId };
      }
      const tenant = await this.landlordService.findTenantById(landlordUser.tenantId);
      return {
        isNew: false as const,
        landlordUserId: landlordUser.id,
        email: landlordUser.email,
        tenantId: tenant.id,
        isSuperAdmin: landlordUser.isSuperAdmin === true,
      };
    }
    // No account yet → onboarding creates the business/tenant.
    return { isNew: true as const, email, name, googleId };
  }

  /**
   * Short-lived signed token carrying a Google identity for a brand-new user,
   * handed to the onboarding flow so it can create the business + link Google.
   */
  signGoogleOnboardingToken(email: string, name: string, googleId: string): string {
    return this.jwtService.sign(
      { purpose: "google-onboarding", email, name, googleId },
      { expiresIn: "30m" },
    );
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

    // Employee self-service (leaves/attendance controllers read
    // req.user.employeeId). Surface the linked HRMS employee — the `employee`
    // relation is eagerly loaded by every auth query below. Null-safe: users
    // without an employee record (e.g. the tenant owner) still work.
    const employee = user.employee
      ? {
          id: user.employee.id,
          employeeNumber: (user.employee as any).employeeNumber ?? null,
          firstName: (user.employee as any).firstName ?? null,
          lastName: (user.employee as any).lastName ?? null,
          // position/department are relations that aren't loaded here — expose
          // the always-present scalar FKs instead of half-loaded objects.
          positionId: (user.employee as any).positionId ?? null,
          departmentId: (user.employee as any).departmentId ?? null,
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      employeeId: user.employee?.id ?? null,
      employee,
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

  // ------------------------------------------------------------------
  // Programmatic API tokens (MCP) — a stable, revocable per-user credential
  // that is EXCHANGED for a normal short-lived JWT. This is the only place the
  // API token is validated; every downstream call uses the minted JWT, so the
  // global guard chain (JwtAuthGuard → TenantGuard → PermissionsGuard) and
  // per-tenant isolation are completely unchanged.
  // ------------------------------------------------------------------

  /** Issue/rotate the current user's API token. Returns the plaintext ONCE. */
  async issueApiToken(userId: string, label?: string) {
    return this.landlordService.issueApiToken(userId, label);
  }

  /** Revoke the current user's API token. */
  async revokeApiToken(userId: string) {
    return this.landlordService.revokeApiToken(userId);
  }

  /** Presentable status of the current user's API token (no secret material). */
  async getApiTokenInfo(userId: string) {
    return this.landlordService.getApiTokenInfo(userId);
  }

  /**
   * Exchange a plaintext API token for a normal, tenant-scoped JWT. Validates
   * the token by hash, re-checks the account/tenant are active (mirrors login),
   * best-effort stamps last-used, then mints a JWT carrying the owner's own
   * tenantId + privilege. A revoked/invalid token yields a 401 — never a JWT.
   */
  async exchangeApiToken(token: string) {
    const user = await this.landlordService.findByApiToken(token);
    if (!user || !user.apiTokenHash || !user.isActive) {
      throw new UnauthorizedException('Invalid or revoked API token.');
    }
    if (!user.tenantId) {
      // A token can only exist on a fully-provisioned account, but guard anyway.
      throw new UnauthorizedException('This account has no active business.');
    }
    const tenant = await this.landlordService.findTenantById(user.tenantId);
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant account is not active');
    }
    // Best-effort telemetry — must not block or deny the exchange.
    void this.landlordService.touchApiTokenLastUsed(user.id);
    const jwt = this.generateToken(
      user.id,
      user.email,
      tenant.id,
      user.isSuperAdmin === true,
    );
    return { token: jwt, tokenType: 'Bearer' as const };
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
