import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from '../stripe.service';
import Stripe from 'stripe';

/**
 * Webhook service for handling Stripe events.
 * This service provides empty controller methods for all Stripe webhook events.
 * TODO: Implement your own business logic in each method.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
  ) {
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    if (!this.webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET is not configured. Webhook signature verification will be disabled.',
      );
    }
  }

  getWebhookSecret(): string {
    return this.webhookSecret;
  }

  constructEvent(
    body: Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    const stripe = this.stripeService.getStripeClient();
    return stripe.webhooks.constructEvent(body, signature, secret);
  }

  /**
   * Handle checkout session completed event
   * TODO: Implement your checkout completion logic
   */
  async handleCheckoutSessionCompleted(event: Stripe.Event) {}

  /**
   * Handle subscription updated event
   * TODO: Implement your subscription update logic
   */
  async handleSubscriptionUpdated(event: Stripe.Event) {}

  /**
   * Handle payment failed event
   * TODO: Implement your payment failure logic
   */
  async handlePaymentFailed(event: Stripe.Event) {}

  /**
   * Handle unhandled event
   * TODO: Implement your unhandled event logic
   */
  async handleUnhandledEvent(event: Stripe.Event) {}
}
