import { Module } from '@nestjs/common';
import { PaypalModule } from '../paypal.module';
import { PaypalPaymentService } from './payment.service';
import { PaypalPaymentController } from './payment.controller';

/**
 * Payment module for managing PayPal one-time payments.
 * Mirrors Stripe payment module while using PayPal REST API under the hood.
 */
@Module({
  imports: [PaypalModule],
  providers: [PaypalPaymentService],
  controllers: [PaypalPaymentController],
  exports: [PaypalPaymentService],
})
export class PaypalPaymentModule {}

