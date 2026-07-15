import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PLAN_CODES = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

export class ChangePlanDto {
  @ApiProperty({ enum: PLAN_CODES })
  @IsIn(PLAN_CODES)
  planCode: string;
}
