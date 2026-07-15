import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LandlordService } from '../landlord/services/landlord.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard that extracts tenant from JWT and switches database schema
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly landlordService: LandlordService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Skip tenant setup for public routes (login, register)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if user exists (JWT should have been validated by JwtAuthGuard first)
    const user = request.user;
    
    // If no user, this means JWT auth failed or wasn't applied yet
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Extract tenantId from JWT payload
    if (!user.tenantId) {
      throw new UnauthorizedException('Tenant ID not found in token');
    }

    try {
      // Get tenant information from landlord database
      const tenant = await this.landlordService.findTenantById(user.tenantId);

      if (!tenant.isActive) {
        throw new UnauthorizedException('Tenant is not active');
      }

      // Attach tenant info to request. The actual schema switch is performed by
      // TenantTransactionInterceptor, which pins one connection per request and
      // sets `SET LOCAL search_path` on it — reliable under connection pooling.
      request.tenant = tenant;
      request.businessId = user.businessId; // Also attach businessId for convenience

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(`Failed to set up tenant connection: ${error.message}`);
    }
  }
}
