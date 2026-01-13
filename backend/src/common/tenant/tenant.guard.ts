import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LandlordService } from '../landlord/services/landlord.service';
import { TenantConnectionService } from './tenant-connection.service';

/**
 * Guard that extracts tenant from JWT and switches database schema
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly landlordService: LandlordService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip tenant setup for public routes (login, register)
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Extract tenantId from JWT payload
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    try {
      // Get tenant information from landlord database
      const tenant = await this.landlordService.findTenantById(user.tenantId);

      if (!tenant.isActive) {
        throw new UnauthorizedException('Tenant is not active');
      }

      // Switch database connection to tenant schema
      await this.tenantConnectionService.switchToTenantSchema(tenant.schemaName);

      // Attach tenant info to request
      request.tenant = tenant;

      return true;
    } catch (error) {
      throw new UnauthorizedException(`Failed to set up tenant connection: ${error.message}`);
    }
  }
}
