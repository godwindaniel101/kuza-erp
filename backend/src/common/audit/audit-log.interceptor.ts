import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|apikey|api_key|pin|otp/i;

/**
 * Records every successful mutating request (POST/PATCH/PUT/DELETE) into the
 * tenant's audit_logs table. Fire-and-forget: auditing never fails or delays
 * the response. Requests without a resolved tenant (public/auth routes) are
 * skipped, and auth endpoint bodies are never stored.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method: string = request?.method;

    if (!method || !MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const schemaName: string | undefined = request?.tenant?.schemaName;
    if (!schemaName) {
      // No tenant context (public/auth route) — nothing to attribute the
      // change to; skip.
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        try {
          const response = context.switchToHttp().getResponse();
          const path: string = this.pathOf(request);
          const isAuthEndpoint = path.includes('/auth');

          void this.auditLogService.record(schemaName, {
            userId: request.user?.sub || null,
            userEmail: request.user?.email || null,
            action: `${method} ${path}`,
            method,
            resource: this.resourceOf(path),
            resourceId: request.params?.id || null,
            statusCode: Number(response?.statusCode) || 200,
            changes: isAuthEndpoint ? null : this.sanitize(request.body),
            ip: request.ip || null,
          });
        } catch {
          // Never let auditing break the request.
        }
      }),
    );
  }

  private pathOf(request: any): string {
    const raw: string = request?.originalUrl || request?.url || '';
    return raw.split('?')[0] || '/';
  }

  /** '/api/invoices/123/payments' → 'invoices' */
  private resourceOf(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'api') {
      segments.shift();
    }
    return segments[0] || 'unknown';
  }

  /** Deep-strip credential-like fields from the request body. */
  private sanitize(body: any, depth = 0): Record<string, any> | null {
    if (!body || typeof body !== 'object' || depth > 5) {
      return null;
    }
    const clean: any = Array.isArray(body) ? [] : {};
    for (const [key, value] of Object.entries(body)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        clean[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        clean[key] = this.sanitize(value, depth + 1);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }
}
