import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body, query, params } = req;

    // Log request
    const requestLog = {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: this.sanitizeBody(body),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    console.log('📥 REQUEST:', JSON.stringify(requestLog, null, 2));

    // Capture response finish event to log response
    const middleware = this;
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseLog = {
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };

      console.log('📤 RESPONSE:', JSON.stringify(responseLog, null, 2));
    });

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    if (!data) return undefined;
    
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Limit response size for logging
      if (JSON.stringify(parsed).length > 10000) {
        return { message: 'Response too large to log', size: JSON.stringify(parsed).length };
      }
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey'];
      const sanitized = JSON.parse(JSON.stringify(parsed));
      
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
      
      return sanitizeObject(sanitized);
    } catch {
      return typeof data === 'string' ? data.substring(0, 500) : data;
    }
  }
}
