import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaypalModule } from '../paypal.module';
import {
  PaypalSubscription,
  PaypalSubscriptionSchema,
} from './schemas/subscription.schema';
import {
  PaypalUserSubscription,
  PaypalUserSubscriptionSchema,
} from './schemas/user-subscription.schema';
import { PaypalSubscriptionService } from './subscription.service';
import { PaypalSubscriptionController } from './subscription.controller';
import { UserModule } from 'src/modules/user/user.module';

/**
 * Subscription module for managing PayPal subscriptions.
 * Handles hosted approval flow, plan retrieval, cancellation, and verification.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaypalSubscription.name, schema: PaypalSubscriptionSchema },
      {
        name: PaypalUserSubscription.name,
        schema: PaypalUserSubscriptionSchema,
      },
    ]),
    PaypalModule,
    forwardRef(() => UserModule),
  ],
  providers: [PaypalSubscriptionService],
  controllers: [PaypalSubscriptionController],
  exports: [PaypalSubscriptionService],
})
export class PaypalSubscriptionModule {}

