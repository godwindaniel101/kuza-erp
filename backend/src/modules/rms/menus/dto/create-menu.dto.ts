import { IsString, IsOptional, IsBoolean, IsArray, IsUUID, ArrayMinSize, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ example: 'Main Menu' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'main-menu', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'Our main restaurant menu', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'uuid-of-branch', required: false })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ 
    example: ['uuid-1', 'uuid-2'], 
    required: false,
    description: 'Inventory item IDs to create menu items from' 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1, { message: 'At least one inventory item must be selected' })
  inventoryItemIds?: string[];
}

