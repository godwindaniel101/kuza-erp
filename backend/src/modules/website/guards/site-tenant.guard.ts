import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebsiteSlugRoute } from '../entities/website-slug-route.entity';

/**
 * Resolves the tenant for the UNAUTHENTICATED public website endpoint.
 * A copy of StoreTenantGuard, reading the landlord `website_slug_routes` table.
 *
 * The controller is @Public() (global JwtAuthGuard + TenantGuard skip it); this
 * guard looks up :slug in the landlord routing table and attaches
 * `request.tenant = { id, schemaName }`, which the global
 * TenantTransactionInterceptor uses to pin the tenant schema for the request.
 * The schemaName comes from our own landlord table (never user input), but it is
 * shape-validated before being quoted into SET LOCAL search_path.
 */
@Injectable()
export class SiteTenantGuard implements CanActivate {
  constructor(
    @InjectRepository(WebsiteSlugRoute, 'landlord')
    private readonly routeRepository: Repository<WebsiteSlugRoute>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug: string | undefined = request.params?.slug;

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      throw new NotFoundException('Site not found');
    }

    const route = await this.routeRepository.findOne({ where: { slug } });
    if (!route) {
      throw new NotFoundException('Site not found');
    }

    // Defense in depth: schemaName is interpolated into SET LOCAL search_path
    // by TenantTransactionInterceptor — never let a malformed value through.
    if (!/^[A-Za-z0-9_]+$/.test(route.schemaName || '')) {
      throw new NotFoundException('Site not found');
    }

    request.tenant = {
      id: route.tenantId,
      schemaName: route.schemaName,
      isActive: true,
    };
    request.websiteSlugRoute = route;

    return true;
  }
}
