import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Lang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
  },
);

