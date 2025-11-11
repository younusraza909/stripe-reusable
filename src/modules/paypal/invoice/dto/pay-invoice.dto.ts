import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PayInvoiceDto {
  @ApiProperty({
    description:
      'Whether to record an offline payment (true) or leave invoice open (false)',
    example: true,
  })
  @IsBoolean()
  payOffline: boolean;

  @ApiProperty({
    description:
      'Optional note describing the manual payment (e.g., bank transfer reference)',
    example: 'Paid via bank transfer TXN-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

