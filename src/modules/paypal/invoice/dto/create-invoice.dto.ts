import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'User ID to create invoice for',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  customerId: number;

  @ApiProperty({
    description: 'Amount in cents (minimum 100 = 1.00)',
    example: 2000,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(100)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217 format)',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Description of the invoice item',
    example: 'Consulting services',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description:
      'Metadata to attach to the invoice item (stored as custom fields)',
    example: { orderId: '12345', project: 'alpha' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
