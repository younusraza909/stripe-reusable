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
   *
   * TODO: Implement your payment fulfillment logic here:
   *
   * For authenticated users:
   * - Grant access to purchased items/features
   * - Update order status in your database
   * - Send confirmation email
   * - Log transaction
   *
   * For guest payments:
   * - Use session.customer_email to identify guest
   * - Check session.metadata for order/product info
   * - Send confirmation email to guest
   * - Process fulfillment based on metadata
   *
   * Example:
   * const session = event.data.object as Stripe.Checkout.Session;
   * const paymentIntent = session.payment_intent;
   * const customerEmail = session.customer_email;
   * const metadata = session.metadata;
   *
   * // Your fulfillment logic here
   *
   * NOTE: This webhook is the source of truth for payment processing.
   * The verify-session endpoint in PaymentController provides immediate UX feedback,
   * but webhook ensures reliable processing even if user closes browser.
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
