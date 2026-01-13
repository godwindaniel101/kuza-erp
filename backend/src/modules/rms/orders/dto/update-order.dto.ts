import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

