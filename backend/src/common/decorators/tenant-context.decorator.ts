import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      tenant: request.tenant,
      businessId: request.businessId || request.user?.businessId,
      user: request.user,
    };
  },
);

export interface ITenantContext {
  tenant: any;
  businessId: string;
  user: any;
}
