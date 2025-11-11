import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaypalModule } from '../paypal.module';
import { PaypalWebhookController } from './webhook.controller';
import { PaypalWebhookService } from './webhook.service';

/**
 * Webhook module for handling PayPal webhook events.
 * TODO: Replace handler implementations with your business logic.
 */
@Module({
  imports: [ConfigModule, PaypalModule],
  controllers: [PaypalWebhookController],
  providers: [PaypalWebhookService],
  exports: [PaypalWebhookService],
})
export class PaypalWebhookModule {}

