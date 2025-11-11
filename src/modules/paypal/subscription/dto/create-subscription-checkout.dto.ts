import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsUrl,
} from 'class-validator';

export class CreateSubscriptionCheckoutDto {
  @ApiProperty({
    description: 'PayPal Plan ID for the subscription',
    example: 'P-5ML4271244454362WXNWU5NQ',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'URL to redirect after successful approval',
    example: 'https://yoursite.com/paypal/subscription/success',
  })
  @IsUrl()
  @IsNotEmpty()
  successUrl: string;

  @ApiProperty({
    description: 'URL to redirect if subscription approval is cancelled',
    example: 'https://yoursite.com/paypal/subscription/cancel',
  })
  @IsUrl()
  @IsNotEmpty()
  cancelUrl: string;

  @ApiProperty({
    description: 'Metadata to attach to the subscription (stored as custom id)',
    example: { source: 'website', campaign: 'spring-sale' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

