import { Injectable, HttpStatus } from '@nestjs/common';
import { PaypalService } from '../paypal.service';
import { UserService } from 'src/modules/user/user.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import {
  SerializeHttpError,
  SerializeHttpResponse,
  SuccessResponse,
  Serialized,
} from 'src/utils';
import {
  PAYPAL_SUCCESS,
  PAYPAL_ERRORS,
} from 'src/common/constant/api-response';

type PaypalInvoice = Record<string, any>;

@Injectable()
export class PaypalInvoiceService {
  constructor(
    private readonly paypalService: PaypalService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a PayPal invoice and return the generated invoice object.
   */
  async createInvoice(
    dto: CreateInvoiceDto,
  ): Promise<SuccessResponse<PaypalInvoice>> {
    const user = await this.userService.findById(dto.customerId);
    if (!user.email) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.CUSTOMER_NOT_FOUND,
      );
    }

    try {
      const invoice = await this.paypalService.request<
        Record<string, unknown>,
        PaypalInvoice
      >({
        method: 'POST',
        path: '/v2/invoicing/invoices',
        body: {
          detail: {
            invoice_number: `INV-${Date.now()}`,
            currency_code: dto.currency.toUpperCase(),
            note: dto.description,
            memo: dto.description,
          },
          invoicer: {
            // TODO: Replace with your business information
            name: {
              given_name: 'Demo',
              surname: 'Merchant',
            },
          },
          primary_recipients: [
            {
              billing_info: {
                email_address: user.email,
                first_name: user.fullName,
              },
            },
          ],
          items: [
            {
              name: dto.description,
              quantity: '1',
              unit_amount: {
                currency_code: dto.currency.toUpperCase(),
                value: this.formatAmount(dto.amount),
              },
            },
          ],
          // Attach metadata as custom fields if provided
          ...(dto.metadata
            ? {
                custom: {
                  label: 'Metadata',
                  value: JSON.stringify(dto.metadata),
                },
              }
            : {}),
        },
      });

      return SerializeHttpResponse(
        invoice,
        HttpStatus.CREATED,
        PAYPAL_SUCCESS.INVOICE_CREATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.INVOICE_CREATION_FAILED,
      );
    }
  }

  async getInvoiceById(
    invoiceId: string,
  ): Promise<
    | Serialized<PaypalInvoice, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    try {
      const invoice = await this.paypalService.request<
        undefined,
        PaypalInvoice
      >({
        method: 'GET',
        path: `/v2/invoicing/invoices/${invoiceId}`,
      });

      return SerializeHttpResponse(
        invoice,
        HttpStatus.OK,
        PAYPAL_SUCCESS.INVOICE_RETRIEVED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.INVOICE_RETRIEVAL_FAILED,
      );
    }
  }

  /**
   * Record a manual payment on a PayPal invoice.
   * PayPal does not support capturing customer cards directly; use record-payment for offline handling.
   */
  async recordManualPayment(
    invoiceId: string,
    dto: PayInvoiceDto,
  ): Promise<
    | Serialized<PaypalInvoice, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    try {
      const invoice = await this.paypalService.request<
        undefined,
        PaypalInvoice
      >({
        method: 'GET',
        path: `/v2/invoicing/invoices/${invoiceId}`,
      });

      const amountDue =
        invoice?.amount?.value ||
        invoice?.detail?.amount?.value ||
        invoice?.detail?.total_amount?.value ||
        invoice?.amount_due?.value ||
        this.formatAmount(0);
      const currency =
        invoice?.amount?.currency_code ||
        invoice?.detail?.amount?.currency_code ||
        invoice?.detail?.currency_code ||
        invoice?.amount_due?.currency_code ||
        'USD';

      await this.paypalService.request({
        method: 'POST',
        path: `/v2/invoicing/invoices/${invoiceId}/record-payment`,
        body: {
          payment: {
            method: dto.payOffline ? 'CASH' : 'OTHER',
            note: dto.note,
            amount: {
              currency_code: currency,
              value: amountDue,
            },
          },
        },
      });

      const updatedInvoice = await this.paypalService.request<
        undefined,
        PaypalInvoice
      >({
        method: 'GET',
        path: `/v2/invoicing/invoices/${invoiceId}`,
      });

      return SerializeHttpResponse(
        updatedInvoice,
        HttpStatus.OK,
        PAYPAL_SUCCESS.INVOICE_PAYMENT_RECORDED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.INVOICE_PAYMENT_FAILED,
      );
    }
  }

  private formatAmount(amountInCents: number): string {
    return (amountInCents / 100).toFixed(2);
  }
}
