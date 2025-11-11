import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description:
      'Whether to cancel immediately (true) or at the end of the current cycle (false)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean = true;

  @ApiProperty({
    description: 'Optional reason for cancellation',
    example: 'Customer requested cancellation',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

