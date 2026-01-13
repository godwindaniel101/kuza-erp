import { PartialType } from '@nestjs/swagger';
import { CreateBenefitPlanDto } from './create-benefit-plan.dto';

export class UpdateBenefitPlanDto extends PartialType(CreateBenefitPlanDto) {}

