import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../common/entities/business.entity';
import { Permission } from '../../common/entities/permission.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BillingService } from '../billing/billing.service';
import { normalizeBusinessType } from '../../common/apps/app-registry';
import {
  PERMISSION_CATALOG,
  PERMISSION_APP_BY_NAME,
} from '../../common/apps/permission-catalog';

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

  /**
   * All permissions, each annotated with its owning app, scoped to the apps the
   * tenant actually has enabled (plus always-on `admin` permissions). When no
   * tenant context is passed, returns the full annotated catalog.
   */
  async getAllPermissions(tenantId?: string, schemaName?: string) {
    await this.ensureCatalogPermissions();
    const rows = await this.permissionRepository.find({
      order: { group: 'ASC', displayName: 'ASC' },
    });

    const effective =
      tenantId && schemaName
        ? await this.billingService.getEffectiveApps(tenantId, schemaName)
        : null;
    const allowed = effective
      ? new Set<string>([...effective, 'admin'])
      : null;

    return rows
      .map((p) => ({
        ...p,
        app: PERMISSION_APP_BY_NAME[p.name] ?? 'admin',
      }))
      .filter((p) => !allowed || allowed.has(p.app));
  }

  private async ensureCatalogPermissions() {
    const existing = await this.permissionRepository.find({ select: ['name'] });
    const existingNames = new Set(existing.map((p) => p.name));
    const missing = PERMISSION_CATALOG.filter((p) => !existingNames.has(p.name));
    if (missing.length > 0) {
      await this.permissionRepository.save(
        // Only persist real columns (the catalog's `app` is read-time metadata).
        missing.map((p) =>
          this.permissionRepository.create({
            name: p.name,
            displayName: p.displayName,
            group: p.group,
          }),
        ),
      );
    }
  }
}

