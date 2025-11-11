import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYPAL_ERRORS } from 'src/common/constant/api-response';

interface PaypalRequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: T;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

/**
 * PayPal REST API service responsible for handling authentication and requests.
 * TODO: Replace fetch with your preferred HTTP client if required.
 */
@Injectable()
export class PaypalService implements OnModuleInit {
  private readonly logger = new Logger(PaypalService.name);
  private clientId: string;
  private clientSecret: string;
  private apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('PAYPAL_CLIENT_SECRET') || '';

    const environment =
      this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';

    this.apiBaseUrl =
      environment === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'PayPal client credentials are not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  private getBasicAuthHeader(): string {
    const credentials = `${this.clientId}:${this.clientSecret}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Requests an access token from PayPal.
   * NOTE: This simplistic implementation retrieves a fresh token each call. Consider caching tokens in production.
   */
  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.getBasicAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      this.logger.error(
        `Failed to obtain PayPal access token: ${response.status} ${response.statusText}`,
      );
      throw new Error(PAYPAL_ERRORS.CONFIGURATION_ERROR);
    }

    const data = await response.json();
    return data.access_token as string;
  }

  /**
   * Sends an authenticated request to the PayPal REST API.
   */
  async request<TBody, TResponse>(
    options: PaypalRequestOptions<TBody>,
  ): Promise<TResponse> {
    const accessToken = await this.getAccessToken();
    const { method = 'GET', path, body, headers, idempotencyKey } = options;

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(idempotencyKey ? { 'PayPal-Request-Id': idempotencyKey } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `PayPal API request failed: ${method} ${path} - ${response.status} ${response.statusText} - ${errorBody}`,
      );
      throw new Error(PAYPAL_ERRORS.API_ERROR);
    }

    if (response.status === 204) {
      return null as TResponse;
    }

    return (await response.json()) as TResponse;
  }
}

