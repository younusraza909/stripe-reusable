import { Controller, Post, HttpStatus, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WebhookService } from './webhook.service';
import { STRIPE_ERRORS } from 'src/common/constant/api-response';
import { SerializeHttpResponse } from 'src/utils';
import Stripe from 'stripe';

@ApiTags('Stripe Webhooks')
@Controller('stripe/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  constructor(private readonly webhookService: WebhookService) {}
  @Post()
  @ApiOperation({
    summary:
      'Handle Stripe webhook events for all payment and subscription events',
  })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = this.webhookService.getWebhookSecret();

    let event: Stripe.Event;
    try {
      const body = req.rawBody;
      if (!Buffer.isBuffer(body)) {
        throw new Error('Request body must be a Buffer');
      }
      event = this.webhookService.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      this.logger.error('Webhook handling error:', err);
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(
          SerializeHttpResponse(
            null,
            HttpStatus.BAD_REQUEST,
            STRIPE_ERRORS.WEBHOOK_SIGNATURE_VERIFICATION_FAILED,
          ),
        );
    }

    this.logger.log(`Received Stripe webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.webhookService.handleCheckoutSessionCompleted(event);
          break;
        case 'customer.subscription.updated':
          await this.webhookService.handleSubscriptionUpdated(event);
          break;
        case 'invoice.payment_failed':
          await this.webhookService.handlePaymentFailed(event);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
          await this.webhookService.handleUnhandledEvent(event);
      }

      this.logger.log(`Webhook event ${event.type} processed successfully`);
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(`Error processing webhook event ${event.type}:`, error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(
          SerializeHttpResponse(
            null,
            HttpStatus.INTERNAL_SERVER_ERROR,
            STRIPE_ERRORS.WEBHOOK_PROCESSING_FAILED,
          ),
        );
    }
  }
}
