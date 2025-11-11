import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaypalService } from './paypal.service';

/**
 * Base PayPal module that provides REST client initialization.
 * This module should be imported by any module that needs PayPal functionality.
 */
@Module({
  imports: [ConfigModule],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}

