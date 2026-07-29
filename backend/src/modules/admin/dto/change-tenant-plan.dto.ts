import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PLAN_CODES = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

/** Super-admin: change a specific tenant's plan. */
export class ChangeTenantPlanDto {
  @ApiProperty({ enum: PLAN_CODES })
  @IsIn(PLAN_CODES)
  planCode: string;
}
