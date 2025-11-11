import { Injectable, HttpStatus } from '@nestjs/common';
import { PaypalService } from '../paypal.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import {
  SerializeHttpError,
  SerializeHttpResponse,
  SuccessResponse,
  Serialized,
} from 'src/utils';
import { PAYPAL_SUCCESS, PAYPAL_ERRORS } from 'src/common/constant/api-response';

type PaypalOrder = Record<string, any>;

@Injectable()
export class PaypalPaymentService {
  constructor(private readonly paypalService: PaypalService) {}

  /**
   * Create a PayPal order to mimic Stripe's Payment Intent flow.
   * PayPal requires a capture call after buyer approval.
   */
  async createPaymentIntent(
    dto: CreatePaymentIntentDto,
  ): Promise<SuccessResponse<PaypalOrder>> {
    try {
      const order = await this.paypalService.request<
        Record<string, unknown>,
        PaypalOrder
      >({
        method: 'POST',
        path: '/v2/checkout/orders',
        body: {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                value: this.formatAmount(dto.amount),
                currency_code: dto.currency.toUpperCase(),
              },
              description: dto.description,
              custom_id: dto.metadata?.orderId,
            },
          ],
          payer: dto.guestEmail
            ? {
                email_address: dto.guestEmail,
              }
            : undefined,
          application_context: {
            user_action: 'PAY_NOW',
          },
        },
      });

      return SerializeHttpResponse(
        order,
        HttpStatus.CREATED,
        PAYPAL_SUCCESS.ORDER_CREATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.ORDER_CREATION_FAILED,
      );
    }
  }

  async retrievePaymentIntent(
    orderId: string,
  ): Promise<
    | Serialized<PaypalOrder, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    try {
      const order = await this.paypalService.request<undefined, PaypalOrder>({
        method: 'GET',
        path: `/v2/checkout/orders/${orderId}`,
      });

      return SerializeHttpResponse(
        order,
        HttpStatus.OK,
        PAYPAL_SUCCESS.ORDER_RETRIEVED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.ORDER_RETRIEVAL_FAILED,
      );
    }
  }

  /**
   * Create a PayPal order with return and cancel URLs (hosted approval flow).
   */
  async createCheckoutSession(
    dto: CreateCheckoutSessionDto,
  ): Promise<SuccessResponse<PaypalOrder>> {
    try {
      const order = await this.paypalService.request<
        Record<string, unknown>,
        PaypalOrder
      >({
        method: 'POST',
        path: '/v2/checkout/orders',
        body: {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                value: this.formatAmount(dto.amount),
                currency_code: dto.currency.toUpperCase(),
              },
              description: dto.description,
              custom_id: dto.metadata?.orderId,
            },
          ],
          payer: dto.guestEmail
            ? {
                email_address: dto.guestEmail,
              }
            : undefined,
          application_context: {
            return_url: dto.successUrl,
            cancel_url: dto.cancelUrl,
            user_action: 'PAY_NOW',
          },
        },
      });

      return SerializeHttpResponse(
        order,
        HttpStatus.CREATED,
        PAYPAL_SUCCESS.ORDER_CREATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.ORDER_CREATION_FAILED,
      );
    }
  }

  /**
   * Verify that a PayPal order was approved and, if desired, captured.
   * NOTE: Capture must happen on frontend or dedicated endpoint after approval.
   */
  async verifyCheckoutSession(
    orderId: string,
  ): Promise<
    | Serialized<PaypalOrder, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    try {
      const order = await this.paypalService.request<undefined, PaypalOrder>({
        method: 'GET',
        path: `/v2/checkout/orders/${orderId}`,
      });

      if (order.status !== 'APPROVED' && order.status !== 'COMPLETED') {
        return SerializeHttpError(
          null,
          HttpStatus.BAD_REQUEST,
          PAYPAL_ERRORS.SESSION_VERIFICATION_FAILED,
        );
      }

      return SerializeHttpResponse(
        order,
        HttpStatus.OK,
        PAYPAL_SUCCESS.SESSION_VERIFIED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SESSION_VERIFICATION_FAILED,
      );
    }
  }

  private formatAmount(amountInCents: number): string {
    return (amountInCents / 100).toFixed(2);
  }
}

