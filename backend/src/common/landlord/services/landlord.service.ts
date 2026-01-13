import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { LandlordUser } from '../entities/landlord-user.entity';
import * as bcrypt from 'bcryptjs';

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
   * Find user by email in landlord database
   */
  async findUserByEmail(email: string): Promise<LandlordUser | null> {
    return await this.landlordUserRepository.findOne({
      where: { email },
      relations: ['tenant'],
    });
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
    tenantId: string,
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
   * Verify user password
   */
  async verifyPassword(user: LandlordUser, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }
}
