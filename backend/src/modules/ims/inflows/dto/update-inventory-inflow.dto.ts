import { PartialType } from '@nestjs/swagger';
import { CreateInventoryInflowDto } from './create-inventory-inflow.dto';

export class UpdateInventoryInflowDto extends PartialType(CreateInventoryInflowDto) {}

