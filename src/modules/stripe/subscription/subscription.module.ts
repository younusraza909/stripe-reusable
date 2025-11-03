import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeModule } from '../stripe.module';
import { CardModule } from '../card/card.module';
import { Subscription } from './entities/subscription.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { UserModule } from 'src/modules/user/user.module';

/**
 * Subscription module for managing Stripe subscriptions.
 * This module handles:
 * - Hosted UI subscription creation via Checkout Sessions
 * - Custom UI subscription creation with existing cards
 * - Subscription upgrades (immediate) and downgrades (scheduled)
 * - Subscription cancellation and resumption
 * - Subscription lifecycle management
 *
 * TODO: Replace with your actual User module
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, UserSubscription]),
    StripeModule,
    CardModule,
    forwardRef(() => UserModule),
  ],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
