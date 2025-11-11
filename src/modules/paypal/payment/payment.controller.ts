import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaypalPaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { SuccessResponse, Serialized, SerializeHttpError } from 'src/utils';
import { STRIPE_ERRORS } from 'src/common/constant/api-response';

/**
 * Payment management controller for PayPal one-time payments.
 * Mirrors the Stripe controller structure while respecting PayPal capabilities.
 *
 * TODO: Replace JwtAuthGuard and @Request() with your own authentication implementation.
 * TODO: Replace the hardcoded user ID extraction with your actual user decorator.
 */
@ApiTags('PayPal Payments')
@Controller('paypal/payments')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard (make it optional for guest support)
// @UseGuards(JwtAuthGuard)
export class PaypalPaymentController {
  constructor(private readonly paymentService: PaypalPaymentService) {}

  /**
   * Create PayPal order for custom UI flow.
   * Returns order details including approval links (if any).
   */
  @Post('intent')
  @ApiOperation({
    summary: 'Create a PayPal order for custom UI flow',
    description:
      'Returns order information for client-side approval/capture. Guest payments require guestEmail.',
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Record<string, any>>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user?.id;
    const userId = 1; // Hardcoded for testing - replace with req.user?.id for optional auth

    // Guest payment validation
    if (!userId && !createPaymentIntentDto.guestEmail) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.GUEST_EMAIL_REQUIRED,
      );
    }

    return this.paymentService.createPaymentIntent(createPaymentIntentDto);
  }

  /**
   * Retrieve PayPal order status.
   */
  @Get('intent/:id')
  @ApiOperation({ summary: 'Retrieve PayPal order by ID' })
  @ApiParam({
    name: 'id',
    description: 'PayPal Order ID',
    example: '5O190127TN364715T',
  })
  async getPaymentIntent(
    @Param('id') orderId: string,
  ): Promise<
    | Serialized<Record<string, any>, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.paymentService.retrievePaymentIntent(orderId);
  }

  /**
   * Create PayPal order for hosted approval flow.
   */
  @Post('checkout')
  @ApiOperation({
    summary: 'Create a PayPal order for hosted approval flow',
    description:
      'Returns order with approval links. Redirect the buyer to links[].href where rel === "approve".',
  })
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Record<string, any>>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user?.id;
    const userId = 1; // Hardcoded for testing - replace with req.user?.id for optional auth

    if (!userId && !createCheckoutSessionDto.guestEmail) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.GUEST_EMAIL_REQUIRED,
      );
    }

    return this.paymentService.createCheckoutSession(createCheckoutSessionDto);
  }

  /**
   * Verify PayPal order after user returns from approval.
   */
  @Get('verify-session/:orderId')
  @ApiOperation({
    summary: 'Verify PayPal order after approval',
    description:
      'Confirms whether the PayPal order is approved/completed. Capture should be handled separately if required.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'PayPal Order ID',
    example: '5O190127TN364715T',
  })
  async verifySession(
    @Param('orderId') orderId: string,
  ): Promise<
    | Serialized<Record<string, any>, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.paymentService.verifyCheckoutSession(orderId);
  }
}

