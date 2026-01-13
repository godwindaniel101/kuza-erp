import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, originalUrl, body, query, params } = request;
    const startTime = Date.now();

    // Log request
    const requestLog = {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: this.sanitizeData(body),
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.get('user-agent'),
    };

    console.log('📥 REQUEST:', JSON.stringify(requestLog, null, 2));

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const responseLog = {
            timestamp: new Date().toISOString(),
            method,
            url: originalUrl,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            response: this.sanitizeData(data),
          };
          console.log('📤 RESPONSE:', JSON.stringify(responseLog, null, 2));
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const errorLog = {
            timestamp: new Date().toISOString(),
            method,
            url: originalUrl,
            statusCode: response.statusCode || 500,
            duration: `${duration}ms`,
            error: error.message || 'Unknown error',
          };
          console.log('❌ ERROR:', JSON.stringify(errorLog, null, 2));
        },
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data) return undefined;
    
    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey'];
      
      const sanitizeObject = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeObject(item));
        }
        if (obj && typeof obj === 'object') {
          const result: any = {};
          for (const key in obj) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
              result[key] = '***REDACTED***';
            } else {
              result[key] = sanitizeObject(obj[key]);
            }
          }
          return result;
        }
        return obj;
      };
      
      // Limit size for logging
      const stringified = JSON.stringify(sanitized);
      if (stringified.length > 10000) {
        return { message: 'Response too large to log', size: stringified.length };
      }
      
      return sanitizeObject(sanitized);
    } catch {
      return typeof data === 'string' ? data.substring(0, 500) : data;
    }
  }
}
