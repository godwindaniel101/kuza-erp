import { IsString, IsDateString, IsArray, IsUUID, IsOptional, IsNumber, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TransferItemDto {
  @ApiProperty()
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty()
  @IsUUID()
  uomId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateInventoryTransferDto {
  @ApiProperty()
  @IsUUID()
  fromBranchId: string;

  @ApiProperty()
  @IsUUID()
  toBranchId: string;

  @ApiProperty()
  @IsDateString()
  transferDate: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTransferStatusDto {
  @ApiProperty({ enum: ['in_transit', 'received', 'cancelled'] })
  @IsEnum(['in_transit', 'received', 'cancelled'])
  status: 'in_transit' | 'received' | 'cancelled';
}

export class ReceiveTransferItemDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

