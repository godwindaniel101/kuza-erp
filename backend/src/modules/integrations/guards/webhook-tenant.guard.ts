import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandlordWebhookRoute } from '../entities/landlord-webhook-route.entity';
import { LandlordService } from '../../../common/landlord/services/landlord.service';

/**
 * Establishes a tenant context for UNAUTHENTICATED webhook requests.
 *
 * How it works (mirrors the authenticated path exactly):
 * 1. The route is @Public(), so the global JwtAuthGuard and TenantGuard
 *    both skip it — request.tenant is unset at this point.
 * 2. This guard (controller-scoped, runs after the global guards) looks
 *    up the LandlordWebhookRoute for :connectionId on the LANDLORD
 *    connection (public database — reachable without tenant context),
 *    loads the Tenant, and sets `request.tenant = tenant`.
 * 3. The global TenantTransactionInterceptor — which runs AFTER all
 *    guards for every route and keys off `request.tenant.schemaName` —
 *    then pins a connection and issues `SET LOCAL search_path`, exactly
 *    as it does for JWT-authenticated requests. All tenant-schema
 *    repository work in the handler resolves correctly.
 */
@Injectable()
export class WebhookTenantGuard implements CanActivate {
  constructor(
    @InjectRepository(LandlordWebhookRoute, 'landlord')
    private readonly routeRepository: Repository<LandlordWebhookRoute>,
    private readonly landlordService: LandlordService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const connectionId: string | undefined = request.params?.connectionId;

    if (!connectionId) {
      throw new NotFoundException('Unknown webhook endpoint');
    }

    const route = await this.routeRepository.findOne({
      where: { connectionId },
    });
    if (!route) {
      throw new NotFoundException('Unknown webhook endpoint');
    }

    const tenant = await this.landlordService.findTenantById(route.tenantId);
    if (!tenant?.isActive) {
      throw new NotFoundException('Unknown webhook endpoint');
    }

    request.tenant = tenant;
    request.webhookRoute = route;
    return true;
  }
}
