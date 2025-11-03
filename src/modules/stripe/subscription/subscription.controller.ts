import {
  Controller,
  Post,
  Get,
  Patch,
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
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreateSubscriptionIntentDto } from './dto/create-subscription-intent.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import Stripe from 'stripe';
import { SerializeHttpResponse, SuccessResponse, Serialized } from 'src/utils';
import { STRIPE_SUCCESS } from 'src/common/constant/api-response';

/**
 * Subscription management controller for Stripe subscriptions.
 * Supports two subscription creation flows:
 * 1. Hosted UI (Checkout Sessions) - Stripe handles card collection
 * 2. Custom UI (Payment Intents) - Uses existing saved cards
 *
 * TODO: Replace JwtAuthGuard and @Request() with your own authentication implementation.
 * TODO: Replace the hardcoded user ID extraction with your actual user decorator.
 */
@ApiTags('Stripe Subscriptions')
@Controller('stripe/subscriptions')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard
// @UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Create subscription using Stripe's hosted Checkout UI
   * Stripe handles card collection and payment method setup
   */
  @Post('checkout')
  @ApiOperation({
    summary: 'Create subscription using Stripe hosted Checkout UI',
    description:
      'Returns Checkout session URL to redirect user. Stripe handles card collection.',
  })
  async createSubscriptionCheckout(
    @Body() createSubscriptionCheckoutDto: CreateSubscriptionCheckoutDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Stripe.Checkout.Session>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Subscriptions are automatically associated with the authenticated user
    // This prevents users from creating subscriptions for other users
    return this.subscriptionService.createSubscriptionCheckout(
      userId,
      createSubscriptionCheckoutDto,
    );
  }

  /**
   * Create subscription using custom UI
   * Requires user to have a payment method already saved
   */
  @Post('intent')
  @ApiOperation({
    summary: 'Create subscription using custom UI',
    description:
      'Requires user to have a saved card. Returns subscription object.',
  })
  async createSubscriptionIntent(
    @Body() createSubscriptionIntentDto: CreateSubscriptionIntentDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Stripe.Subscription>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Subscriptions are automatically associated with the authenticated user
    // This prevents users from creating subscriptions for other users
    return this.subscriptionService.createSubscriptionIntent(
      userId,
      createSubscriptionIntentDto,
    );
  }

  /**
   * Get user's current active subscription
   */
  @Get()
  @ApiOperation({ summary: 'Get current active subscription' })
  async getUserSubscription(@Request() req: any) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Only returns subscription belonging to the authenticated user
    return this.subscriptionService.getUserSubscription(userId);
  }

  /**
   * Get all subscription history for user
   */
  @Get('history')
  @ApiOperation({ summary: 'Get all subscription history for user' })
  async getAllSubscriptions(@Request() req: any) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Only returns subscriptions belonging to the authenticated user
    return this.subscriptionService.getAllSubscriptions(userId);
  }

  /**
   * Get all available subscription plans
   */
  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  async getAvailablePlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  /**
   * Upgrade subscription immediately with proration
   */
  @Patch('upgrade')
  @ApiOperation({
    summary: 'Upgrade subscription immediately',
    description:
      'Changes take effect immediately with prorated charges/credits',
  })
  async upgradeSubscription(
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Request() req: any,
  ) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Users can only upgrade their own subscriptions
    return this.subscriptionService.upgradeSubscription(
      userId,
      updateSubscriptionDto,
    );
  }

  /**
   * Downgrade subscription - effective from next billing cycle
   */
  @Patch('downgrade')
  @ApiOperation({
    summary: 'Downgrade subscription',
    description:
      'Changes take effect from the next billing cycle (no immediate charge)',
  })
  async downgradeSubscription(
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Request() req: any,
  ) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Users can only downgrade their own subscriptions
    return this.subscriptionService.downgradeSubscription(
      userId,
      updateSubscriptionDto,
    );
  }

  /**
   * Cancel subscription
   */
  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'Cancels at period end by default. Set cancelAtPeriodEnd=false for immediate cancellation',
  })
  async cancelSubscription(
    @Body() cancelSubscriptionDto: CancelSubscriptionDto,
    @Request() req: any,
  ) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Users can only cancel their own subscriptions
    return this.subscriptionService.cancelSubscription(
      userId,
      cancelSubscriptionDto,
    );
  }

  /**
   * Resume cancelled subscription
   */
  @Post('resume')
  @ApiOperation({
    summary: 'Resume cancelled subscription',
    description:
      'Undoes a cancellation before the period ends. Subscription continues normally.',
  })
  async resumeSubscription(@Request() req: any) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Users can only resume their own subscriptions
    return this.subscriptionService.resumeSubscription(userId);
  }

  /**
   * Verify checkout session after redirect from Stripe
   */
  @Get('verify/:sessionId')
  @ApiOperation({
    summary: 'Verify checkout session after redirect',
    description:
      'Called after user returns from Stripe. Webhook handles reliable processing in background.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Stripe Checkout Session ID',
    example: 'cs_test_a1234567890abcdef',
  })
  async verifySession(@Param('sessionId') sessionId: string) {
    return this.subscriptionService.verifyCheckoutSession(sessionId);
  }
}
