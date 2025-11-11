import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsString,
  IsEmail,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentIntentDto {
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
    default: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Description of the order',
    example: 'Order #1234',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Metadata to attach to the order',
    example: { orderId: 'ORD-123', source: 'website' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @ApiProperty({
    description: 'Email for guest payments (required when not authenticated)',
    example: 'customer@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}

