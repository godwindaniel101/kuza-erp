import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAwaitingDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ required: false, description: 'The sale/order this payment is for' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}
