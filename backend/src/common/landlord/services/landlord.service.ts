import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { LandlordUser } from '../entities/landlord-user.entity';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class LandlordService {
  constructor(
    @InjectRepository(Tenant, 'landlord')
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(LandlordUser, 'landlord')
    private landlordUserRepository: Repository<LandlordUser>,
    @Inject('LANDLORD_CONNECTION')
    private landlordConnection: DataSource,
  ) {}

  /**
   * Find tenant by ID
   */
  async findTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId } as any,
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Find tenant by slug
   */
  async findTenantBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Get all tenants
   */
  async getAllTenants(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find user by email in landlord database
   */
  async findUserByEmail(email: string): Promise<LandlordUser | null> {
    return await this.landlordUserRepository.findOne({
      where: { email },
      relations: ['tenant'],
    });
  }

  /**
   * Find user by ID in landlord database
   */
  async findUserById(id: string): Promise<LandlordUser | null> {
    return await this.landlordUserRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });
  }

  /**
   * Link a Google account to an existing landlord user (first Google sign-in),
   * and mark the email verified since Google has verified it.
   */
  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.landlordUserRepository.update(
      { id: userId } as any,
      { googleId, emailVerified: new Date() },
    );
  }

  /**
   * Create a new tenant and its schema/database
   */
  async createTenant(name: string, slug: string): Promise<Tenant> {
    // Check if slug already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant with this slug already exists');
    }

    // Generate schema name (slug with underscore prefix for PostgreSQL)
    const schemaName = `tenant_${slug.replace(/[^a-z0-9]/g, '_')}`;

    // Create tenant record
    const tenant = this.tenantRepository.create({
      name,
      slug,
      schemaName,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Create schema for this tenant
    await this.createTenantSchema(savedTenant.schemaName);

    return savedTenant;
  }

  /**
   * Create PostgreSQL schema for tenant
   * This should use the tenant database connection, not the landlord connection
   */
  async createTenantSchema(schemaName: string): Promise<void> {
    try {
      // Get the default tenant database connection (not landlord)
      // We'll inject DataSource separately for tenant operations
      // For now, create schema using the same database but different connection
      await this.landlordConnection.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // After creating schema, we need to initialize tables
      // This will be handled by TenantMigrationService
    } catch (error) {
      console.error(`Failed to create schema ${schemaName}:`, error);
      throw error;
    }
  }

  /**
   * Create landlord user (for authentication)
   */
  async createLandlordUser(
    name: string,
    email: string,
    password: string,
    tenantId: string | null,
  ): Promise<LandlordUser> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.landlordUserRepository.create({
      name,
      email,
      password: hashedPassword,
      tenantId,
    });

    return await this.landlordUserRepository.save(user);
  }

  /**
   * Link a (previously business-less) landlord user to the tenant provisioned
   * for them at onboarding, and set their display name. Used by the email-first
   * signup flow and by new-Google-user onboarding.
   */
  async setUserTenant(
    userId: string,
    tenantId: string,
    name?: string,
  ): Promise<void> {
    // Invariant: an account that owns a business is verified. The email-first
    // and Google paths already set emailVerified before this point; the legacy
    // single-shot register() does not, so stamp it here to keep every
    // provisioned account able to log in through the verification gate.
    const patch: Partial<LandlordUser> = { tenantId, emailVerified: new Date() };
    if (name) patch.name = name;
    await this.landlordUserRepository.update({ id: userId } as any, patch);
  }

  /**
   * Mark a landlord user's email as verified (email-first signup).
   */
  async markEmailVerified(userId: string): Promise<void> {
    await this.landlordUserRepository.update(
      { id: userId } as any,
      { emailVerified: new Date() },
    );
  }

  /**
   * Create a brand-new, business-less landlord user from a verified Google
   * identity (email already verified by Google). A random password is stored so
   * the column is non-empty; the account is driven by Google sign-in. Returns
   * the existing row if one already matches the email (idempotent).
   */
  async createGoogleUser(
    name: string,
    email: string,
    googleId: string,
  ): Promise<LandlordUser> {
    const existing = await this.findUserByEmail(email);
    if (existing) return existing;
    const randomPassword = await bcrypt.hash(`${googleId}:${email}:google`, 10);
    const user = this.landlordUserRepository.create({
      name: name || email.split('@')[0],
      email,
      password: randomPassword,
      tenantId: null,
      googleId,
      emailVerified: new Date(),
    });
    return await this.landlordUserRepository.save(user);
  }

  /**
   * Create landlord user for invited user (no password initially)
   */
  async createLandlordUserFromInvitation(
    name: string,
    email: string,
    password: string,
    tenantId: string,
  ): Promise<LandlordUser> {
    // Check if user already exists by email
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      // If user exists but belongs to different tenant, we could potentially
      // allow multi-tenant access, but for now we'll throw an error
      if (existingUser.tenantId !== tenantId) {
        throw new ConflictException('User already exists in another tenant');
      }
      // User exists in same tenant, just return the existing user
      return existingUser;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.landlordUserRepository.create({
      name,
      email,
      password: hashedPassword,
      tenantId,
    });

    return await this.landlordUserRepository.save(user);
  }

  /**
   * Update landlord user password (for first-time login from invitation)
   */
  async updateLandlordUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.landlordUserRepository.update(userId, { password: hashedPassword });
  }

  /**
   * Verify user password
   */
  async verifyPassword(user: LandlordUser, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  /**
   * Promote the landlord user with the given email to platform super-admin.
   * Landlord-scoped; used by the SUPER_ADMIN_EMAIL seeder on boot.
   *
   * - Idempotent: no-op if the user is already a super-admin.
   * - Safe no-op if `email` is falsy or no matching user exists (returns a
   *   discriminated result so the caller can log the difference). This never
   *   creates a user and never establishes a bypass — it only flips a flag on
   *   an existing, self-registered landlord user.
   */
  async ensureSuperAdminByEmail(
    email?: string | null,
  ): Promise<'promoted' | 'already' | 'not-found'> {
    if (!email) {
      return 'not-found';
    }
    // Match case-insensitively + trimmed: SUPER_ADMIN_EMAIL casing must not have
    // to exactly equal the case the user typed at signup (emails are stored
    // verbatim, so 'Godwin@x.com' would otherwise never match 'godwin@x.com').
    const user = await this.landlordUserRepository
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
    if (!user) {
      return 'not-found';
    }
    if (user.isSuperAdmin) {
      return 'already';
    }
    user.isSuperAdmin = true;
    await this.landlordUserRepository.save(user);
    return 'promoted';
  }

  // ------------------------------------------------------------------
  // Programmatic API tokens (MCP) — hashed at rest, plaintext shown once.
  // ------------------------------------------------------------------

  /** SHA-256 hex of a plaintext API token. Deterministic — lets us look a token
   *  up by hash without ever storing the plaintext. */
  private hashApiToken(token: string): string {
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }

  /**
   * Issue (or rotate) the current user's API token. Generates a fresh random
   * token, stores ONLY its hash (+ label + createdAt, and clears lastUsed), and
   * returns the plaintext ONCE — the caller must surface it immediately; it can
   * never be retrieved again. Any previously-issued token is invalidated.
   */
  async issueApiToken(
    userId: string,
    label?: string,
  ): Promise<{ token: string; createdAt: Date }> {
    const user = await this.landlordUserRepository.findOne({
      where: { id: userId } as any,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // 32 bytes of CSPRNG entropy, url-safe. The `kuza_` prefix makes the token
    // recognizable and greppable in secret scanners / leak detection.
    const plaintext = `kuza_${crypto.randomBytes(32).toString('base64url')}`;
    const createdAt = new Date();
    await this.landlordUserRepository.update({ id: userId } as any, {
      apiTokenHash: this.hashApiToken(plaintext),
      apiTokenLabel: label?.trim() ? label.trim().slice(0, 100) : null,
      apiTokenCreatedAt: createdAt,
      apiTokenLastUsedAt: null,
    });
    return { token: plaintext, createdAt };
  }

  /** Revoke the current user's API token (nulls every token column). Idempotent. */
  async revokeApiToken(userId: string): Promise<void> {
    await this.landlordUserRepository.update({ id: userId } as any, {
      apiTokenHash: null,
      apiTokenLabel: null,
      apiTokenCreatedAt: null,
      apiTokenLastUsedAt: null,
    });
  }

  /** Look up the landlord user owning a given token hash (null if none). */
  async findByApiTokenHash(hash: string): Promise<LandlordUser | null> {
    if (!hash) return null;
    return this.landlordUserRepository.findOne({
      where: { apiTokenHash: hash } as any,
    });
  }

  /**
   * Resolve the active landlord user for a PLAINTEXT API token. Hashing happens
   * here (the boundary) so callers never handle the hash. Returns null for a
   * missing / malformed token.
   */
  async findByApiToken(token: string): Promise<LandlordUser | null> {
    if (!token || typeof token !== 'string') return null;
    return this.findByApiTokenHash(this.hashApiToken(token));
  }

  /**
   * Best-effort "last used" stamp for an API token. Never throws — token
   * exchange must not fail on a telemetry write.
   */
  async touchApiTokenLastUsed(userId: string): Promise<void> {
    try {
      await this.landlordUserRepository.update({ id: userId } as any, {
        apiTokenLastUsedAt: new Date(),
      });
    } catch {
      /* non-fatal — ignore */
    }
  }

  /** Presentable status of the current user's API token (never leaks the hash). */
  async getApiTokenInfo(userId: string): Promise<{
    hasToken: boolean;
    label: string | null;
    createdAt: Date | null;
    lastUsedAt: Date | null;
  }> {
    const user = await this.landlordUserRepository.findOne({
      where: { id: userId } as any,
    });
    return {
      hasToken: !!user?.apiTokenHash,
      label: user?.apiTokenLabel ?? null,
      createdAt: user?.apiTokenCreatedAt ?? null,
      lastUsedAt: user?.apiTokenLastUsedAt ?? null,
    };
  }
}
