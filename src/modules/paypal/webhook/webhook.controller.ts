import {
  Controller,
  Post,
  HttpStatus,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
  import { ApiTags, ApiOperation } from '@nestjs/swagger';
  import type { Request, Response } from 'express';
  import { PaypalWebhookService } from './webhook.service';
  import { SerializeHttpResponse } from 'src/utils';
  import { PAYPAL_ERRORS } from 'src/common/constant/api-response';

  @ApiTags('PayPal Webhooks')
  @Controller('paypal/webhooks')
  export class PaypalWebhookController {
    private readonly logger = new Logger(PaypalWebhookController.name);

    constructor(private readonly webhookService: PaypalWebhookService) {}

    @Post()
    @ApiOperation({
      summary:
        'Handle PayPal webhook events for payment, subscription, and invoice events',
    })
    async handleWebhook(
      @Req() req: Request,
      @Res() res: Response,
    ) {
      const transmissionId =
        (req.headers['paypal-transmission-id'] as string) ?? '';
      const timestamp =
        (req.headers['paypal-transmission-time'] as string) ?? '';
      const signature =
        (req.headers['paypal-transmission-sig'] as string) ?? '';
      const certUrl = (req.headers['paypal-cert-url'] as string) ?? '';
      const authAlgo = (req.headers['paypal-auth-algo'] as string) ?? '';

      const event = req.body;

      try {
        const isValid = await this.webhookService.verifySignature({
          transmissionId,
          timestamp,
          signature,
          certUrl,
          authAlgo,
          body: event,
        });

        if (!isValid) {
          this.logger.error('PayPal webhook signature verification failed');
          return res
            .status(HttpStatus.BAD_REQUEST)
            .json(
              SerializeHttpResponse(
                null,
                HttpStatus.BAD_REQUEST,
                PAYPAL_ERRORS.WEBHOOK_VERIFICATION_FAILED,
              ),
            );
        }

        this.logger.log(`Received PayPal webhook event: ${event.event_type}`);

        switch (event.event_type) {
          case 'CHECKOUT.ORDER.APPROVED':
            await this.webhookService.handleCheckoutOrderApproved(event);
            break;
          case 'BILLING.SUBSCRIPTION.ACTIVATED':
            await this.webhookService.handleSubscriptionActivated(event);
            break;
          case 'BILLING.SUBSCRIPTION.CANCELLED':
            await this.webhookService.handleSubscriptionCancelled(event);
            break;
          case 'INVOICING.INVOICE.PAID':
            await this.webhookService.handleInvoicePaid(event);
            break;
          default:
            await this.webhookService.handleUnhandledEvent(event);
        }

        return res.status(HttpStatus.OK).json({ received: true });
      } catch (error) {
        this.logger.error('Error processing PayPal webhook', error);
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(
            SerializeHttpResponse(
              null,
              HttpStatus.INTERNAL_SERVER_ERROR,
              PAYPAL_ERRORS.WEBHOOK_PROCESSING_FAILED,
            ),
          );
      }
    }
  }

