import { IsString, IsEmail, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  hireDate: string;

  @ApiProperty({ example: 'full_time', enum: ['full_time', 'part_time', 'contract', 'intern', 'consultant'] })
  @IsEnum(['full_time', 'part_time', 'contract', 'intern', 'consultant'])
  employmentType: string;

  @ApiProperty({ example: 'dept-uuid', required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: 'pos-uuid', required: false })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiProperty({ example: 'loc-uuid', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ example: 'emp-uuid', required: false })
  @IsOptional()
  @IsString()
  managerId?: string;

  // Bank Account Information
  @ApiProperty({ example: 'Chase Bank', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiProperty({ example: '021000021', required: false })
  @IsOptional()
  @IsString()
  bankRoutingNumber?: string;

  @ApiProperty({ example: 'checking', enum: ['checking', 'savings'], required: false })
  @IsOptional()
  @IsEnum(['checking', 'savings'])
  bankAccountType?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  bankAccountHolderName?: string;

  @ApiProperty({ example: 'CHASUS33', required: false })
  @IsOptional()
  @IsString()
  bankSwiftCode?: string;

  @ApiProperty({ example: 'GB82WEST12345698765432', required: false })
  @IsOptional()
  @IsString()
  bankIban?: string;

  @ApiProperty({ example: 'bank_transfer', enum: ['bank_transfer', 'check', 'cash'], required: false })
  @IsOptional()
  @IsEnum(['bank_transfer', 'check', 'cash'])
  paymentMethod?: string;
}

