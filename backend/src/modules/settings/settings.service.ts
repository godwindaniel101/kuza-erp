import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../common/entities/business.entity';
import { Permission } from '../../common/entities/permission.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BillingService } from '../billing/billing.service';
import { normalizeBusinessType } from '../../common/apps/app-registry';

/**
 * Catalog of permissions introduced by newer modules. Upserted lazily (by
 * unique name) when the permission list is read, so existing tenants gain
 * them without a migration — same pattern as the accounting chart seed.
 */
const PERMISSION_CATALOG: Array<Pick<Permission, 'name' | 'displayName' | 'group'>> = [
  { name: 'accounting.view', displayName: 'View accounting', group: 'Accounting' },
  { name: 'accounting.manage', displayName: 'Manage accounting', group: 'Accounting' },
  { name: 'sales.view', displayName: 'View customers & invoices', group: 'Sales' },
  { name: 'sales.manage', displayName: 'Manage customers & invoices', group: 'Sales' },
  { name: 'inventory.approve', displayName: 'Approve inventory changes', group: 'Inventory' },
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    // BillingModule is @Global, so no module import is needed here (and none
    // is added, avoiding any settings↔billing import cycle).
    private billingService: BillingService,
  ) {}

  async getSettings(tenantId?: string, schemaName?: string) {
    // In multi-tenant setup, each tenant database has only one business
    const business = await this.businessRepository.findOne({
      where: {},
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Effective apps = (enabledApps ?? legacy-all) ∩ plan-allowed apps.
    const effectiveApps =
      tenantId && schemaName
        ? await this.billingService.getEffectiveApps(tenantId, schemaName)
        : [];

    return {
      name: business.name,
      description: business.description,
      logo: business.logo,
      primaryColor: business.primaryColor,
      secondaryColor: business.secondaryColor,
      currency: business.currency || 'NGN',
      language: business.language || 'en',
      allocationMethod: business.allocationMethod || 'FIFO',
      // Normalized at read time so legacy tenants (stored 'restaurant',
      // 'services', 'general') also report their canonical edition.
      businessType: normalizeBusinessType(business.businessType),
      enabledApps: business.enabledApps ?? null,
      effectiveApps,
    };
  }

  async updateSettings(updateDto: UpdateSettingsDto) {
    // In multi-tenant setup, each tenant database has only one business
    const business = await this.businessRepository.findOne({
      where: {},
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    Object.assign(business, {
      name: updateDto.name ?? business.name,
      description: updateDto.description ?? business.description,
      logo: updateDto.logo ?? business.logo,
      primaryColor: updateDto.primaryColor ?? business.primaryColor,
      secondaryColor: updateDto.secondaryColor ?? business.secondaryColor,
      currency: updateDto.currency ?? business.currency,
      language: updateDto.language ?? business.language,
      allocationMethod: updateDto.allocationMethod ?? business.allocationMethod,
    });

    return await this.businessRepository.save(business);
  }

  async getAllPermissions() {
    await this.ensureCatalogPermissions();
    return await this.permissionRepository.find({
      order: { group: 'ASC', displayName: 'ASC' },
    });
  }

  private async ensureCatalogPermissions() {
    const existing = await this.permissionRepository.find({ select: ['name'] });
    const existingNames = new Set(existing.map((p) => p.name));
    const missing = PERMISSION_CATALOG.filter((p) => !existingNames.has(p.name));
    if (missing.length > 0) {
      await this.permissionRepository.save(
        missing.map((p) => this.permissionRepository.create(p)),
      );
    }
  }
}

