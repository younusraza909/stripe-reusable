import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for resuming a suspended PayPal subscription.
 * No fields required - the action is implicit.
 */
export class ResumeSubscriptionDto {
  @ApiProperty({
    description:
      'Placeholder - no fields required for resume action (leave empty object)',
    example: {},
    required: false,
  })
  placeholder?: any;
}

