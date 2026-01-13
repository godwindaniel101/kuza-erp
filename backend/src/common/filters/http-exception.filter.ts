import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const i18n = I18nContext.current();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        
        // Handle validation errors (BadRequestException from class-validator, including I18nValidationException)
        if (status === HttpStatus.BAD_REQUEST) {
          // Check for nested validation errors (from ValidateNested)
          if (responseObj.errors && Array.isArray(responseObj.errors)) {
            errors = responseObj.errors;
          } else if (responseObj.message) {
            if (Array.isArray(responseObj.message)) {
              // Validation errors array from class-validator
              errors = responseObj.message.map((validationError: any) => {
                // Handle nested validation errors
                if (validationError.children && Array.isArray(validationError.children) && validationError.children.length > 0) {
                  const nestedErrors: any[] = [];
                  validationError.children.forEach((child: any, index: number) => {
                    if (child.constraints && typeof child.constraints === 'object') {
                      const constraintKeys = Object.keys(child.constraints);
                      nestedErrors.push({
                        field: `${validationError.property}[${index}].${child.property}`,
                        message: child.constraints[constraintKeys[0]],
                      });
                    }
                  });
                  return nestedErrors;
                }
                
                // Handle ValidationError object format
                if (typeof validationError === 'object') {
                  if (validationError.constraints && typeof validationError.constraints === 'object') {
                    const constraintKeys = Object.keys(validationError.constraints);
                    const fieldName = validationError.property || 'field';
                    return {
                      field: fieldName,
                      message: validationError.constraints[constraintKeys[0]],
                    };
                  }
                  
                  if (validationError.property) {
                    return {
                      field: validationError.property,
                      message: validationError.message || `${validationError.property} has invalid value`,
                    };
                  }
                  
                  if (validationError.message) {
                    return {
                      message: validationError.message,
                    };
                  }
                }
                
                if (typeof validationError === 'string') {
                  const parts = validationError.split(' ').filter((p: string) => p.length > 0);
                  if (parts.length >= 3 && (parts[1] === 'must' || parts[1] === 'should' || parts[1] === 'is')) {
                    return {
                      field: parts[0],
                      message: parts.slice(1).join(' '),
                    };
                  }
                  return { message: validationError };
                }
                
                return { message: String(validationError) };
              });
              
              // Flatten nested arrays
              errors = errors.flat();
              
              // Create a user-friendly message from errors
              if (errors && errors.length > 0) {
                const errorMessages = errors.map((e: any) => {
                  if (e && typeof e === 'object' && e.field) {
                    const fieldName = e.field
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str: string) => str.toUpperCase())
                      .trim();
                    return `${fieldName}: ${e.message}`;
                  }
                  return e && typeof e === 'object' ? e.message : String(e);
                }).filter((msg: string) => msg && msg.trim().length > 0);

                if (errorMessages.length === 1) {
                  message = errorMessages[0];
                } else if (errorMessages.length > 1) {
                  const firstTwo = errorMessages.slice(0, 2);
                  const remaining = errorMessages.length - 2;
                  message = `Validation failed: ${firstTwo.join('; ')}${remaining > 0 ? ` and ${remaining} more error(s)` : ''}`;
                } else {
                  message = 'Validation failed';
                }
              } else {
                message = 'Validation failed';
              }
            } else if (typeof responseObj.message === 'string') {
              message = responseObj.message;
            } else if (responseObj.message && typeof responseObj.message === 'object') {
              if (Array.isArray(responseObj.message.errors)) {
                errors = responseObj.message.errors;
              } else if (responseObj.message.message) {
                message = responseObj.message.message;
                errors = responseObj.message.errors || null;
              } else {
                message = responseObj.message || responseObj.error || 'Bad Request';
              }
            } else {
              message = responseObj.message || responseObj.error || 'Bad Request';
            }
          } else {
            message = responseObj.message || responseObj.error || 'Bad Request';
          }
        } else {
          // Handle other HTTP exceptions
          message = responseObj.message || responseObj.error || 'An error occurred';
          errors = responseObj.errors || null;
        }
        
        // Debug logging in development
        if (process.env.NODE_ENV !== 'production' && status === HttpStatus.BAD_REQUEST) {
          console.log('Validation error details:', JSON.stringify(responseObj, null, 2));
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message: typeof message === 'string' ? message : 'An error occurred',
      errors: errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // In development, include stack trace
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
