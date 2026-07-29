import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVirtualAccountDto {
  @ApiProperty({ description: 'Customer to create the virtual account for' })
  @IsUUID()
  customerId: string;
}
