import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  getTenantId(): string | null {
    // Get tenant ID from JWT token (set during authentication)
    const user = (this.request as any).user;
    return user?.businessId || null;
  }

  getTenantIdFromHeader(): string | null {
    // Get tenant ID from custom header (for API clients)
    return (this.request.headers['x-tenant-id'] as string) || null;
  }

  getCurrentTenantId(): string {
    const tenantId = this.getTenantId() || this.getTenantIdFromHeader();
    if (!tenantId) {
      throw new Error('Tenant ID not found in request');
    }
    return tenantId;
  }
}

