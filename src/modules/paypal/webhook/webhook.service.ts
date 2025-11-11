import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaypalService } from '../paypal.service';
import { PAYPAL_ERRORS } from 'src/common/constant/api-response';

/**
 * Webhook service for handling PayPal events.
 * TODO: Implement your own business logic in each handler.
 */
@Injectable()
export class PaypalWebhookService {
  private readonly logger = new Logger(PaypalWebhookService.name);
  private readonly webhookId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly paypalService: PaypalService,
  ) {
    this.webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID') || '';
    if (!this.webhookId) {
      this.logger.warn(
        'PAYPAL_WEBHOOK_ID is not configured. Webhook verification will fail.',
      );
    }
  }

  getWebhookId(): string {
    return this.webhookId;
  }

  /**
   * Verify webhook signature using PayPal API.
   */
  async verifySignature(params: {
    transmissionId: string;
    timestamp: string;
    signature: string;
    certUrl: string;
    authAlgo: string;
    body: any;
  }): Promise<boolean> {
    if (!this.webhookId) {
      throw new Error(PAYPAL_ERRORS.CONFIGURATION_ERROR);
    }

    const response = await this.paypalService.request<
      Record<string, unknown>,
      { verification_status: string }
    >({
      method: 'POST',
      path: '/v1/notifications/verify-webhook-signature',
      body: {
        transmission_id: params.transmissionId,
        transmission_time: params.timestamp,
        cert_url: params.certUrl,
        auth_algo: params.authAlgo,
        transmission_sig: params.signature,
        webhook_id: this.webhookId,
        webhook_event: params.body,
      },
    });

    return response.verification_status === 'SUCCESS';
  }

  async handleCheckoutOrderApproved(event: any) {
    const resource = event.resource;
    this.logger.log(
      `PayPal order approved: ${resource.id}, status: ${resource.status}`,
    );
    // TODO: Implement your checkout completion fulfillment logic here
  }

  async handleSubscriptionActivated(event: any) {
    // TODO: Sync subscription status in PaypalSubscriptionService
    this.logger.log(
      `PayPal subscription activated: ${event.resource.id} status: ${event.resource.status}`,
    );
  }

  async handleSubscriptionCancelled(event: any) {
    // TODO: Sync subscription cancellation in PaypalSubscriptionService
    this.logger.log(
      `PayPal subscription cancelled: ${event.resource.id}`,
    );
  }

  async handleInvoicePaid(event: any) {
    // TODO: Sync invoice payment in PaypalInvoiceService
    this.logger.log(`PayPal invoice paid: ${event.resource.id}`);
  }

  async handleUnhandledEvent(event: any) {
    this.logger.log(`Unhandled PayPal event type: ${event.event_type}`);
  }
}

