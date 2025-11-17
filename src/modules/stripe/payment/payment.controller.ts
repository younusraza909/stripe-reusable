import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  BadRequestException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import Stripe from 'stripe';
import {
  SerializeHttpResponse,
  SuccessResponse,
  Serialized,
  SerializeHttpError,
} from 'src/utils';
import { STRIPE_ERRORS } from 'src/common/constant/api-response';

/**
 * Payment management controller for Stripe one-time payments.
 * Supports two payment flows:
 * 1. Custom UI with Stripe Elements (Payment Intent)
 * 2. Redirect to Stripe hosted page (Checkout Session)
 *
 * Both flows support authenticated users and guest payments.
 *
 * TODO: Replace JwtAuthGuard and @Request() with your own authentication implementation.
 * TODO: Replace the hardcoded user ID extraction with your actual user decorator.
 *
 * IMPORTANT: Implement webhook handler in webhook.service.ts for 'checkout.session.completed'
 * This ensures reliable payment processing even if user closes browser after payment.
 * Webhook is the source of truth; verify-session endpoint is for immediate UX feedback.
 */
@ApiTags('Stripe Payments')
@Controller('stripe/payments')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard (make it optional for guest support)
// @UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create Payment Intent for custom UI flow (Stripe Elements)
   * Supports both authenticated and guest payments
   */
  @Post('intent')
  @ApiOperation({
    summary: 'Create a Payment Intent for custom UI flow',
    description:
      'Returns client_secret for use with Stripe Elements. For guest payments, guestEmail is required.',
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Stripe.PaymentIntent>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user?.id;
    const userId = '1'; // Hardcoded for testing - replace with req.user?.id for optional auth

    // Guest payment validation
    // For guest payments (no auth), guestEmail is required
    if (!userId && !createPaymentIntentDto.guestEmail) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.GUEST_EMAIL_REQUIRED,
      );
    }

    return this.paymentService.createPaymentIntent(
      createPaymentIntentDto,
      userId || undefined,
    );
  }

  /**
   * Retrieve Payment Intent status
   * Used to verify payment after frontend confirmation
   */
  @Get('intent/:id')
  @ApiOperation({ summary: 'Retrieve Payment Intent by ID' })
  @ApiParam({
    name: 'id',
    description: 'Stripe Payment Intent ID',
    example: 'pi_1234567890abcdef',
  })
  async getPaymentIntent(
    @Param('id') paymentIntentId: string,
  ): Promise<
    | Serialized<Stripe.PaymentIntent, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.paymentService.retrievePaymentIntent(paymentIntentId);
  }

  /**
   * Create Checkout Session for redirect flow
   * Supports both authenticated and guest payments
   */
  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Checkout Session for redirect flow',
    description:
      'Returns session URL to redirect user. For guest payments, guestEmail is required.',
  })
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Stripe.Checkout.Session>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user?.id;
    const userId = '1'; // Hardcoded for testing - replace with req.user?.id for optional auth

    // Guest payment validation
    // For guest payments (no auth), guestEmail is required
    if (!userId && !createCheckoutSessionDto.guestEmail) {
      throw new BadRequestException('Guest email is required');
    }

    return this.paymentService.createCheckoutSession(
      createCheckoutSessionDto,
      userId || undefined,
    );
  }

  /**
   * Verify Checkout Session after user returns from Stripe
   * Provides immediate UX feedback (webhook handles reliable processing)
   */
  @Get('verify-session/:sessionId')
  @ApiOperation({
    summary: 'Verify Checkout Session after redirect',
    description:
      'Called after user returns from Stripe. Webhook processes payment in background for reliability.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Stripe Checkout Session ID',
    example: 'cs_test_a1234567890abcdef',
  })
  async verifySession(
    @Param('sessionId') sessionId: string,
  ): Promise<
    | Serialized<Stripe.Checkout.Session, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.paymentService.verifyCheckoutSession(sessionId);
  }
}
