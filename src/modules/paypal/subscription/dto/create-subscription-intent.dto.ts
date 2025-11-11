import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateSubscriptionIntentDto {
  @ApiProperty({
    description: 'PayPal Plan ID for the subscription',
    example: 'P-5ML4271244454362WXNWU5NQ',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description:
      'PayPal payment source token (not supported for server-side creation)',
    example: 'CARD-1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentSourceToken?: string;

  @ApiProperty({
    description: 'Metadata to attach to the subscription',
    example: { source: 'mobile-app', campaign: 'spring-sale' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

