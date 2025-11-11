import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaypalModule } from '../paypal.module';
import { PaypalSubscription } from './entities/subscription.entity';
import { PaypalUserSubscription } from './entities/user-subscription.entity';
import { PaypalSubscriptionService } from './subscription.service';
import { PaypalSubscriptionController } from './subscription.controller';
import { UserModule } from 'src/modules/user/user.module';

/**
 * Subscription module for managing PayPal subscriptions.
 * Handles hosted approval flow, plan retrieval, cancellation, and verification.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaypalSubscription, PaypalUserSubscription]),
    PaypalModule,
    forwardRef(() => UserModule),
  ],
  providers: [PaypalSubscriptionService],
  controllers: [PaypalSubscriptionController],
  exports: [PaypalSubscriptionService],
})
export class PaypalSubscriptionModule {}

