import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({
    description: 'New PayPal Plan ID to switch to',
    example: 'P-5ML4271244454362WXNWU5NQ',
  })
  @IsString()
  @IsNotEmpty()
  newPlanId: string;
}

