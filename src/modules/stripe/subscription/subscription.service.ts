import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StripeService } from '../stripe.service';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from './schemas/user-subscription.schema';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreateSubscriptionIntentDto } from './dto/create-subscription-intent.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionStatusEnum } from './enums/subscription-status.enum';
import { UserService } from 'src/modules/user/user.service';
import { CardService } from '../card/card.service';
import Stripe from 'stripe';
import {
  SerializeHttpResponse,
  SerializeHttpError,
  SuccessResponse,
} from 'src/utils';
import {
  STRIPE_SUCCESS,
  STRIPE_ERRORS,
} from 'src/common/constant/api-response';

/**
 * Subscription service for managing Stripe subscriptions.
 *
 * ARCHITECTURE NOTES:
 * - Direct API operations immediately sync database after Stripe calls
 * - Webhooks act as backup/verification (see webhook.service.ts TODOs)
 * - This ensures data consistency if webhook fails or is delayed
 * - All Stripe changes trigger immediate DB updates for UX responsiveness
 *
 * Webhook handlers (empty by default):
 * - customer.subscription.created: Create user_subscription for Checkout Sessions
 * - customer.subscription.updated: Sync status/plan changes
 * - customer.subscription.deleted: Mark as CANCELED
 * - invoice.payment_succeeded: Confirm subscription activation
 * - invoice.payment_failed: Mark as PAST_DUE
 */
@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    private readonly stripeService: StripeService,
    private readonly userService: UserService,
    private readonly cardService: CardService,
  ) {}

  /**
   * Create subscription using Stripe's hosted Checkout UI
   * Stripe handles card collection and payment method setup
   */
  async createSubscriptionCheckout(
    userId: string,
    dto: CreateSubscriptionCheckoutDto,
  ): Promise<SuccessResponse<Stripe.Checkout.Session>> {
    const stripe = this.stripeService.getStripeClient();
    const user = await this.userService.findById(userId);

    // Get/create Stripe customer
    if (!user.stripeCustomerId) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.CUSTOMER_NOT_FOUND,
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (existingSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_ALREADY_EXISTS,
      );
    }

    // Find subscription plan in database
    const plan = await this.subscriptionModel.findOne({
      stripePriceId: dto.priceId,
    });

    if (!plan) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.INVALID_PLAN,
      );
    }

    // Create Checkout Session for subscription
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: user.stripeCustomerId,
        success_url: dto.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: dto.cancelUrl,
        line_items: [
          {
            price: dto.priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            ...dto.metadata,
          },
        },
        metadata: {
          userId: userId.toString(),
          ...dto.metadata,
        },
      });

      // For Checkout Sessions, subscription is created AFTER payment
      // We can't create user_subscription here yet since session.subscription is null
      // The webhook will create it when checkout.session.completed is received
      // See handleCheckoutSessionCompleted in webhook.service.ts

      return SerializeHttpResponse(
        session,
        HttpStatus.CREATED,
        STRIPE_SUCCESS.SUBSCRIPTION_CREATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_CREATION_FAILED,
      );
    }
  }

  /**
   * Create subscription using custom UI
   * Requires user to have a payment method already saved
   */
  async createSubscriptionIntent(
    userId: string,
    dto: CreateSubscriptionIntentDto,
  ): Promise<SuccessResponse<Stripe.Subscription>> {
    const stripe = this.stripeService.getStripeClient();
    const user = await this.userService.findById(userId);

    // Validate user has stripeCustomerId
    if (!user.stripeCustomerId) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.CUSTOMER_NOT_FOUND,
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (existingSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_ALREADY_EXISTS,
      );
    }

    // Get or validate payment method
    let paymentMethodId = dto.paymentMethodId;
    if (!paymentMethodId) {
      //We try to get user's default card, if not found, we use the first card
      // Below we are using card module feel free to attach your own card module
      const cardsResponse = await this.cardService.getCards(userId);
      if (!cardsResponse.data || cardsResponse.data.length === 0) {
        return SerializeHttpError(
          null,
          HttpStatus.BAD_REQUEST,
          STRIPE_ERRORS.PAYMENT_METHOD_REQUIRED,
        );
      }
      const defaultCard = cardsResponse.data.find((card) => card.isDefault);
      paymentMethodId = defaultCard
        ? defaultCard.stripePaymentMethodId
        : cardsResponse.data[0].stripePaymentMethodId;
    }

    // Find subscription plan in database
    const plan = await this.subscriptionModel.findOne({
      stripePriceId: dto.priceId,
    });

    if (!plan) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.INVALID_PLAN,
      );
    }

    try {
      // Create Stripe subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [
          {
            price: dto.priceId,
          },
        ],
        default_payment_method: paymentMethodId,
        metadata: {
          userId: userId.toString(),
          ...dto.metadata,
        },
      });

      // For Intent flow, subscription is created IMMEDIATELY
      // We can create user_subscription record right away since we have the subscription object
      const userSubscription = new this.userSubscriptionModel({
        userId,
        subscriptionId: plan._id,
        stripeSubscriptionId: subscription.id,
        status: (subscription as any).status as SubscriptionStatusEnum,
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
        isCurrent: true,
      });
      await userSubscription.save();

      return SerializeHttpResponse(
        subscription,
        HttpStatus.CREATED,
        STRIPE_SUCCESS.SUBSCRIPTION_CREATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_CREATION_FAILED,
      );
    }
  }

  /**
   * Get user's current active subscription
   */
  async getUserSubscription(
    userId: string,
  ): Promise<SuccessResponse<UserSubscriptionDocument>> {
    const subscription = await this.userSubscriptionModel
      .findOne({ userId, isCurrent: true })
      .populate('subscriptionId')
      .populate('pendingSubscriptionId')
      .exec();

    if (!subscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        STRIPE_ERRORS.NO_ACTIVE_SUBSCRIPTION,
      );
    }

    return SerializeHttpResponse(
      subscription,
      HttpStatus.OK,
      STRIPE_SUCCESS.SUBSCRIPTION_RETRIEVED,
    );
  }

  /**
   * Get all subscription history for user
   */
  async getAllSubscriptions(
    userId: string,
  ): Promise<SuccessResponse<UserSubscriptionDocument[]>> {
    const subscriptions = await this.userSubscriptionModel
      .find({ userId })
      .populate('subscriptionId')
      .populate('pendingSubscriptionId')
      .sort({ createdAt: -1 })
      .exec();

    return SerializeHttpResponse(
      subscriptions,
      HttpStatus.OK,
      STRIPE_SUCCESS.SUBSCRIPTIONS_RETRIEVED,
    );
  }

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SuccessResponse<SubscriptionDocument[]>> {
    const plans = await this.subscriptionModel
      .find({ isActive: true })
      .sort({ amount: 1 })
      .exec();

    return SerializeHttpResponse(
      plans,
      HttpStatus.OK,
      STRIPE_SUCCESS.PLANS_RETRIEVED,
    );
  }

  /**
   * Upgrade subscription immediately with proration
   */
  async upgradeSubscription(
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SuccessResponse<Stripe.Subscription>> {
    const stripe = this.stripeService.getStripeClient();

    // Get current active subscription
    const userSubscription = await this.userSubscriptionModel
      .findOne({ userId, isCurrent: true })
      .populate('subscriptionId')
      .exec();

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        STRIPE_ERRORS.NO_ACTIVE_SUBSCRIPTION,
      );
    }

    // Find new subscription plan
    const newPlan = await this.subscriptionModel.findOne({
      stripePriceId: dto.newPriceId,
    });

    if (!newPlan) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.INVALID_PLAN,
      );
    }

    // Check if downgrading to same plan
    if (
      (userSubscription.subscriptionId as any).toString() ===
      (newPlan._id as any).toString()
    ) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.CANNOT_DOWNGRADE_TO_SAME_PLAN,
      );
    }

    try {
      // Get current subscription from Stripe
      const currentSub = await stripe.subscriptions.retrieve(
        userSubscription.stripeSubscriptionId,
      );

      // Update subscription immediately with proration
      const updatedSub = await stripe.subscriptions.update(
        userSubscription.stripeSubscriptionId,
        {
          items: [
            {
              id: (currentSub as any).items.data[0].id,
              price: dto.newPriceId,
            },
          ],
          proration_behavior: 'create_prorations', // Immediate charge/credit
        },
      );

      // Update user subscription record
      userSubscription.subscriptionId = newPlan._id as any;
      userSubscription.status = (updatedSub as any)
        .status as SubscriptionStatusEnum;
      userSubscription.currentPeriodEnd = new Date(
        (updatedSub as any).current_period_end * 1000,
      );
      await userSubscription.save();

      return SerializeHttpResponse(
        updatedSub,
        HttpStatus.OK,
        STRIPE_SUCCESS.SUBSCRIPTION_UPGRADED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_UPDATE_FAILED,
      );
    }
  }

  /**
   * Downgrade subscription - effective from next billing cycle
   */
  async downgradeSubscription(
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SuccessResponse<Stripe.Subscription>> {
    const stripe = this.stripeService.getStripeClient();

    // Get current active subscription
    const userSubscription = await this.userSubscriptionModel
      .findOne({ userId, isCurrent: true })
      .populate('subscriptionId')
      .exec();

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        STRIPE_ERRORS.NO_ACTIVE_SUBSCRIPTION,
      );
    }

    // Find new subscription plan
    const newPlan = await this.subscriptionModel.findOne({
      stripePriceId: dto.newPriceId,
    });

    if (!newPlan) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.INVALID_PLAN,
      );
    }

    // Check if downgrading to same plan
    if (
      (userSubscription.subscriptionId as any).toString() ===
      (newPlan._id as any).toString()
    ) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.CANNOT_DOWNGRADE_TO_SAME_PLAN,
      );
    }

    try {
      // Get current subscription from Stripe
      const currentSub = await stripe.subscriptions.retrieve(
        userSubscription.stripeSubscriptionId,
      );

      // Update subscription with scheduled change using Subscription Schedule
      const schedule = await stripe.subscriptionSchedules.create({
        customer: (currentSub as any).customer as string,
        start_date: (currentSub as any).current_period_end,
        end_behavior: 'release',
        phases: [
          {
            // Current phase continues until period end
            items: [
              {
                price: (currentSub as any).items.data[0].price.id,
                quantity: 1,
              },
            ],
          },
          {
            // New phase starts after period end
            items: [
              {
                price: dto.newPriceId,
                quantity: 1,
              },
            ],
          },
        ],
      });

      // Update user subscription record with pending subscription
      userSubscription.pendingSubscriptionId = newPlan._id as any;
      userSubscription.scheduledChangeAt = new Date(
        (currentSub as any).current_period_end * 1000,
      );
      userSubscription.stripeSubscriptionScheduleId = schedule.id;
      await userSubscription.save();

      return SerializeHttpResponse(
        currentSub,
        HttpStatus.OK,
        STRIPE_SUCCESS.SUBSCRIPTION_DOWNGRADED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_UPDATE_FAILED,
      );
    }
  }

  /**
   * Cancel subscription - effective from next billing cycle by default
   */
  async cancelSubscription(
    userId: string,
    dto: CancelSubscriptionDto,
  ): Promise<SuccessResponse<Stripe.Subscription>> {
    const stripe = this.stripeService.getStripeClient();

    // Get current active subscription
    const userSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        STRIPE_ERRORS.NO_ACTIVE_SUBSCRIPTION,
      );
    }

    try {
      const cancelAtPeriodEnd = dto.cancelAtPeriodEnd ?? true;

      if (cancelAtPeriodEnd) {
        // Cancel at period end (default behavior)
        const updatedSub = await stripe.subscriptions.update(
          userSubscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          },
        );

        userSubscription.canceledAt = new Date();
        userSubscription.status = (updatedSub as any)
          .status as SubscriptionStatusEnum;
        await userSubscription.save();

        return SerializeHttpResponse(
          updatedSub,
          HttpStatus.OK,
          STRIPE_SUCCESS.SUBSCRIPTION_CANCELED,
        );
      } else {
        // Cancel immediately
        const canceledSub = await stripe.subscriptions.cancel(
          userSubscription.stripeSubscriptionId,
        );

        userSubscription.status = SubscriptionStatusEnum.CANCELED;
        userSubscription.isCurrent = false;
        userSubscription.canceledAt = new Date();
        await userSubscription.save();

        return SerializeHttpResponse(
          canceledSub,
          HttpStatus.OK,
          STRIPE_SUCCESS.SUBSCRIPTION_CANCELED,
        );
      }
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_CANCEL_FAILED,
      );
    }
  }

  /**
   * Resume a cancelled subscription
   */
  async resumeSubscription(
    userId: string,
  ): Promise<SuccessResponse<Stripe.Subscription>> {
    const stripe = this.stripeService.getStripeClient();

    // Get current subscription
    const userSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        STRIPE_ERRORS.NO_ACTIVE_SUBSCRIPTION,
      );
    }

    if (!userSubscription.canceledAt) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        'Subscription is not cancelled',
      );
    }

    try {
      const updatedSub = await stripe.subscriptions.update(
        userSubscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        },
      );

      userSubscription.canceledAt = undefined;
      userSubscription.resumesAt = new Date();
      userSubscription.status = (updatedSub as any)
        .status as SubscriptionStatusEnum;
      await userSubscription.save();

      return SerializeHttpResponse(
        updatedSub,
        HttpStatus.OK,
        STRIPE_SUCCESS.SUBSCRIPTION_RESUMED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SUBSCRIPTION_UPDATE_FAILED,
      );
    }
  }

  /**
   * Verify checkout session after redirect from Stripe
   */
  async verifyCheckoutSession(
    sessionId: string,
  ): Promise<SuccessResponse<Stripe.Checkout.Session>> {
    const stripe = this.stripeService.getStripeClient();

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (
        session.payment_status === 'paid' &&
        session.mode === 'subscription'
      ) {
        return SerializeHttpResponse(
          session,
          HttpStatus.OK,
          STRIPE_SUCCESS.SESSION_VERIFIED,
        );
      }

      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SESSION_NOT_FOUND,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.SESSION_NOT_FOUND,
      );
    }
  }
}
