import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuSlugRoute } from '../entities/menu-slug-route.entity';

/**
 * Resolves the tenant for the UNAUTHENTICATED public menu endpoint.
 *
 * How public tenant resolution works here:
 * - The controller is marked @Public(), so the global JwtAuthGuard and
 *   TenantGuard both skip it (IS_PUBLIC_KEY metadata).
 * - This controller-level guard runs next: it looks up the :slug in the
 *   landlord `menu_slug_routes` table and attaches
 *   `request.tenant = { schemaName }` — exactly what TenantGuard would have
 *   attached for an authenticated request.
 * - The global TenantTransactionInterceptor then sees
 *   `request.tenant.schemaName`, pins one connection for the request inside
 *   a transaction and issues `SET LOCAL search_path TO "<schema>", public`.
 *   Every tenant-connection repository call in the handler therefore reads
 *   the correct tenant schema, with no auth and no cookies.
 *
 * The schemaName comes from our own landlord table (never user input), but
 * because it is interpolated into `SET LOCAL search_path` we still validate
 * its shape defensively before attaching it.
 */
@Injectable()
export class MenuSiteTenantGuard implements CanActivate {
  constructor(
    @InjectRepository(MenuSlugRoute, 'landlord')
    private readonly routeRepository: Repository<MenuSlugRoute>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug: string | undefined = request.params?.slug;

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      throw new NotFoundException('Menu not found');
    }

    const route = await this.routeRepository.findOne({ where: { slug } });
    if (!route) {
      throw new NotFoundException('Menu not found');
    }

    // Defense in depth: schemaName is interpolated into SET LOCAL search_path
    // by TenantTransactionInterceptor — never let a malformed value through.
    if (!/^[A-Za-z0-9_]+$/.test(route.schemaName || '')) {
      throw new NotFoundException('Menu not found');
    }

    request.tenant = {
      id: route.tenantId,
      schemaName: route.schemaName,
      isActive: true,
    };
    request.menuSlugRoute = route;

    return true;
  }
}
