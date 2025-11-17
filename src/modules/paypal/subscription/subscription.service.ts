import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaypalService } from '../paypal.service';
import {
  PaypalSubscription,
  PaypalSubscriptionDocument,
} from './schemas/subscription.schema';
import {
  PaypalUserSubscription,
  PaypalUserSubscriptionDocument,
} from './schemas/user-subscription.schema';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { CreateSubscriptionIntentDto } from './dto/create-subscription-intent.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { ResumeSubscriptionDto } from './dto/resume-subscription.dto';
import { PaypalSubscriptionStatusEnum } from './enums/subscription-status.enum';
import { UserService } from 'src/modules/user/user.service';
import {
  SerializeHttpResponse,
  SerializeHttpError,
  SuccessResponse,
} from 'src/utils';
import {
  PAYPAL_SUCCESS,
  PAYPAL_ERRORS,
} from 'src/common/constant/api-response';

type PaypalSubscriptionResponse = Record<string, any>;

@Injectable()
export class PaypalSubscriptionService {
  constructor(
    @InjectModel(PaypalSubscription.name)
    private readonly subscriptionModel: Model<PaypalSubscriptionDocument>,
    @InjectModel(PaypalUserSubscription.name)
    private readonly userSubscriptionModel: Model<PaypalUserSubscriptionDocument>,
    private readonly paypalService: PaypalService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create PayPal subscription using hosted approval flow.
   */
  async createSubscriptionCheckout(
    userId: string,
    dto: CreateSubscriptionCheckoutDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const user = await this.userService.findById(userId);

    const existingSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (existingSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SUBSCRIPTION_CREATION_FAILED,
      );
    }

    const plan = await this.subscriptionModel.findOne({
      paypalPlanId: dto.planId,
    });

    if (!plan) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.PLAN_NOT_FOUND,
      );
    }

    try {
      const subscription = await this.paypalService.request<
        Record<string, unknown>,
        PaypalSubscriptionResponse
      >({
        method: 'POST',
        path: '/v1/billing/subscriptions',
        body: {
          plan_id: dto.planId,
          subscriber: {
            name: {
              given_name: user.fullName?.split(' ')[0] || user.fullName,
              surname: user.fullName?.split(' ').slice(1).join(' ') || '',
            },
            email_address: user.email,
          },
          custom_id: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
          application_context: {
            return_url: dto.successUrl,
            cancel_url: dto.cancelUrl,
          },
        },
      });

      const userSubscription = new this.userSubscriptionModel({
        userId,
        subscriptionId: plan._id,
        paypalSubscriptionId: subscription.id,
        status: PaypalSubscriptionStatusEnum.APPROVAL_PENDING,
        isCurrent: true,
      });
      await userSubscription.save();

      return SerializeHttpResponse(
        subscription,
        HttpStatus.CREATED,
        PAYPAL_SUCCESS.SUBSCRIPTION_CREATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SUBSCRIPTION_CREATION_FAILED,
      );
    }
  }

  /**
   * PayPal does not support server-side subscription creation without buyer approval.
   */
  async createSubscriptionIntent(
    _userId: string,
    _dto: CreateSubscriptionIntentDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    return SerializeHttpError(
      null,
      HttpStatus.BAD_REQUEST,
      PAYPAL_ERRORS.FEATURE_NOT_SUPPORTED,
    );
  }

  async getUserSubscription(
    userId: string,
  ): Promise<SuccessResponse<PaypalUserSubscription>> {
    const subscription = await this.userSubscriptionModel
      .findOne({ userId, isCurrent: true })
      .populate('subscriptionId')
      .populate('pendingSubscriptionId')
      .exec();

    if (!subscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        PAYPAL_ERRORS.SUBSCRIPTION_NOT_FOUND,
      );
    }

    return SerializeHttpResponse(
      subscription,
      HttpStatus.OK,
      PAYPAL_SUCCESS.SUBSCRIPTION_RETRIEVED,
    );
  }

  async getAllSubscriptions(
    userId: string,
  ): Promise<SuccessResponse<PaypalUserSubscription[]>> {
    const subscriptions = await this.userSubscriptionModel
      .find({ userId })
      .populate('subscriptionId')
      .populate('pendingSubscriptionId')
      .sort({ createdAt: -1 })
      .exec();

    return SerializeHttpResponse(
      subscriptions,
      HttpStatus.OK,
      PAYPAL_SUCCESS.SUBSCRIPTIONS_RETRIEVED,
    );
  }

  async getAvailablePlans(): Promise<SuccessResponse<PaypalSubscription[]>> {
    const plans = await this.subscriptionModel
      .find({ isActive: true })
      .sort({ amount: 1 })
      .exec();

    return SerializeHttpResponse(
      plans,
      HttpStatus.OK,
      PAYPAL_SUCCESS.SUBSCRIPTIONS_RETRIEVED,
    );
  }

  /**
   * Revise subscription to switch to a new plan.
   * PayPal applies the change on the next billing cycle by default.
   */
  async reviseSubscription(
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const userSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        PAYPAL_ERRORS.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const newPlan = await this.subscriptionModel.findOne({
      paypalPlanId: dto.newPlanId,
    });

    if (!newPlan) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.PLAN_NOT_FOUND,
      );
    }

    try {
      const revised = await this.paypalService.request<
        Record<string, unknown>,
        PaypalSubscriptionResponse
      >({
        method: 'POST',
        path: `/v1/billing/subscriptions/${userSubscription.paypalSubscriptionId}/revise`,
        body: {
          plan_id: dto.newPlanId,
        },
      });

      userSubscription.subscriptionId = newPlan._id as any;
      userSubscription.status = PaypalSubscriptionStatusEnum.APPROVAL_PENDING;
      await userSubscription.save();

      return SerializeHttpResponse(
        revised,
        HttpStatus.OK,
        PAYPAL_SUCCESS.SUBSCRIPTION_UPDATED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SUBSCRIPTION_ACTIVATION_FAILED,
      );
    }
  }

  async cancelSubscription(
    userId: string,
    dto: CancelSubscriptionDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const userSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        PAYPAL_ERRORS.SUBSCRIPTION_NOT_FOUND,
      );
    }

    try {
      await this.paypalService.request({
        method: 'POST',
        path: `/v1/billing/subscriptions/${userSubscription.paypalSubscriptionId}/cancel`,
        body: {
          reason: dto.reason ?? 'Customer requested cancellation',
        },
      });

      userSubscription.status = PaypalSubscriptionStatusEnum.CANCELLED;
      userSubscription.isCurrent = false;
      userSubscription.canceledAt = new Date();
      await userSubscription.save();

      return SerializeHttpResponse(
        { id: userSubscription.paypalSubscriptionId },
        HttpStatus.OK,
        PAYPAL_SUCCESS.SUBSCRIPTION_CANCELED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SUBSCRIPTION_CANCELLATION_FAILED,
      );
    }
  }

  async resumeSubscription(
    userId: string,
    _dto?: ResumeSubscriptionDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const userSubscription = await this.userSubscriptionModel.findOne({
      userId,
      isCurrent: true,
    });

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        PAYPAL_ERRORS.SUBSCRIPTION_NOT_FOUND,
      );
    }

    try {
      await this.paypalService.request({
        method: 'POST',
        path: `/v1/billing/subscriptions/${userSubscription.paypalSubscriptionId}/activate`,
        body: {
          reason: 'Customer requested reactivation',
        },
      });

      userSubscription.status = PaypalSubscriptionStatusEnum.ACTIVE;
      userSubscription.canceledAt = undefined;
      userSubscription.resumesAt = new Date();
      await userSubscription.save();

      return SerializeHttpResponse(
        { id: userSubscription.paypalSubscriptionId },
        HttpStatus.OK,
        PAYPAL_SUCCESS.SUBSCRIPTION_RESUMED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SUBSCRIPTION_ACTIVATION_FAILED,
      );
    }
  }

  async verifyCheckoutSession(
    subscriptionId: string,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    try {
      const subscription = await this.paypalService.request<
        undefined,
        PaypalSubscriptionResponse
      >({
        method: 'GET',
        path: `/v1/billing/subscriptions/${subscriptionId}`,
      });

      if (
        subscription.status === PaypalSubscriptionStatusEnum.ACTIVE ||
        subscription.status === PaypalSubscriptionStatusEnum.APPROVED
      ) {
        return SerializeHttpResponse(
          subscription,
          HttpStatus.OK,
          PAYPAL_SUCCESS.SESSION_VERIFIED,
        );
      }

      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SESSION_VERIFICATION_FAILED,
      );
    } catch (error) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SESSION_VERIFICATION_FAILED,
      );
    }
  }
}

