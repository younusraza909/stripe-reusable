import { Controller, Post, Get, Patch, Body, Param, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaypalSubscriptionService } from './subscription.service';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreateSubscriptionIntentDto } from './dto/create-subscription-intent.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { ResumeSubscriptionDto } from './dto/resume-subscription.dto';
import { SuccessResponse, Serialized } from 'src/utils';

/**
 * Subscription management controller for PayPal subscriptions.
 * Mirrors Stripe subscription controller while respecting PayPal limitations.
 *
 * TODO: Replace JwtAuthGuard and @Request() with your own authentication implementation.
 * TODO: Replace the hardcoded user ID extraction with your actual user decorator.
 */
@ApiTags('PayPal Subscriptions')
@Controller('paypal/subscriptions')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard
// @UseGuards(JwtAuthGuard)
export class PaypalSubscriptionController {
  constructor(private readonly subscriptionService: PaypalSubscriptionService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Create PayPal subscription using hosted approval flow',
    description:
      'Returns subscription object with approval links. Buyer must approve on PayPal.',
  })
  async createSubscriptionCheckout(
    @Body() dto: CreateSubscriptionCheckoutDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Record<string, any>>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    return this.subscriptionService.createSubscriptionCheckout(userId, dto);
  }

  @Post('intent')
  @ApiOperation({
    summary: 'Create PayPal subscription using custom UI (not supported)',
    description:
      'PayPal requires buyer approval; this endpoint returns not supported error.',
  })
  async createSubscriptionIntent(
    @Body() dto: CreateSubscriptionIntentDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Record<string, any>>> {
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token
    return this.subscriptionService.createSubscriptionIntent(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current PayPal subscription for user' })
  async getUserSubscription(@Request() req: any) {
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get PayPal subscription history for user' })
  async getAllSubscriptions(@Request() req: any) {
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token
    return this.subscriptionService.getAllSubscriptions(userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available PayPal subscription plans' })
  async getAvailablePlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  @Patch('revise')
  @ApiOperation({
    summary: 'Revise PayPal subscription to a new plan',
    description:
      'PayPal applies plan changes on the next billing cycle. Buyer approval may be required.',
  })
  async reviseSubscription(
    @Body() dto: UpdateSubscriptionDto,
    @Request() req: any,
  ) {
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token
    return this.subscriptionService.reviseSubscription(userId, dto);
  }

  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel PayPal subscription',
  })
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @Request() req: any,
  ) {
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token
    return this.subscriptionService.cancelSubscription(userId, dto);
  }

  @Post('resume')
  @ApiOperation({
    summary: 'Resume PayPal subscription',
  })
  async resumeSubscription(
    @Body() dto: ResumeSubscriptionDto,
    @Request() req: any,
  ) {
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token
    return this.subscriptionService.resumeSubscription(userId, dto);
  }

  @Get('verify/:subscriptionId')
  @ApiOperation({
    summary: 'Verify PayPal subscription after approval redirect',
  })
  @ApiParam({
    name: 'subscriptionId',
    description: 'PayPal subscription ID',
    example: 'I-BW452GLLEP1G',
  })
  async verifySession(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionService.verifyCheckoutSession(subscriptionId);
  }
}

