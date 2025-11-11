import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaypalService } from '../paypal.service';
import { PaypalSubscription } from './entities/subscription.entity';
import { PaypalUserSubscription } from './entities/user-subscription.entity';
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
    @InjectRepository(PaypalSubscription)
    private readonly subscriptionRepository: Repository<PaypalSubscription>,
    @InjectRepository(PaypalUserSubscription)
    private readonly userSubscriptionRepository: Repository<PaypalUserSubscription>,
    private readonly paypalService: PaypalService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create PayPal subscription using hosted approval flow.
   */
  async createSubscriptionCheckout(
    userId: number,
    dto: CreateSubscriptionCheckoutDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const user = await this.userService.findById(userId);

    const existingSubscription = await this.userSubscriptionRepository.findOne({
      where: { userId, isCurrent: true },
    });

    if (existingSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        PAYPAL_ERRORS.SUBSCRIPTION_CREATION_FAILED,
      );
    }

    const plan = await this.subscriptionRepository.findOne({
      where: { paypalPlanId: dto.planId },
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

      const userSubscription = this.userSubscriptionRepository.create({
        userId,
        subscriptionId: plan.id,
        paypalSubscriptionId: subscription.id,
        status: PaypalSubscriptionStatusEnum.APPROVAL_PENDING,
        isCurrent: true,
      });
      await this.userSubscriptionRepository.save(userSubscription);

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
    _userId: number,
    _dto: CreateSubscriptionIntentDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    return SerializeHttpError(
      null,
      HttpStatus.BAD_REQUEST,
      PAYPAL_ERRORS.FEATURE_NOT_SUPPORTED,
    );
  }

  async getUserSubscription(
    userId: number,
  ): Promise<SuccessResponse<PaypalUserSubscription>> {
    const subscription = await this.userSubscriptionRepository.findOne({
      where: { userId, isCurrent: true },
      relations: ['subscription', 'pendingSubscription'],
    });

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
    userId: number,
  ): Promise<SuccessResponse<PaypalUserSubscription[]>> {
    const subscriptions = await this.userSubscriptionRepository.find({
      where: { userId },
      relations: ['subscription', 'pendingSubscription'],
      order: { createdAt: 'DESC' },
    });

    return SerializeHttpResponse(
      subscriptions,
      HttpStatus.OK,
      PAYPAL_SUCCESS.SUBSCRIPTIONS_RETRIEVED,
    );
  }

  async getAvailablePlans(): Promise<SuccessResponse<PaypalSubscription[]>> {
    const plans = await this.subscriptionRepository.find({
      where: { isActive: true },
      order: { amount: 'ASC' },
    });

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
    userId: number,
    dto: UpdateSubscriptionDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const userSubscription = await this.userSubscriptionRepository.findOne({
      where: { userId, isCurrent: true },
    });

    if (!userSubscription) {
      return SerializeHttpError(
        null,
        HttpStatus.NOT_FOUND,
        PAYPAL_ERRORS.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const newPlan = await this.subscriptionRepository.findOne({
      where: { paypalPlanId: dto.newPlanId },
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

      userSubscription.subscriptionId = newPlan.id;
      userSubscription.status = PaypalSubscriptionStatusEnum.APPROVAL_PENDING;
      await this.userSubscriptionRepository.save(userSubscription);

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
    userId: number,
    dto: CancelSubscriptionDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const userSubscription = await this.userSubscriptionRepository.findOne({
      where: { userId, isCurrent: true },
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
      await this.userSubscriptionRepository.save(userSubscription);

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
    userId: number,
    _dto?: ResumeSubscriptionDto,
  ): Promise<SuccessResponse<PaypalSubscriptionResponse>> {
    const userSubscription = await this.userSubscriptionRepository.findOne({
      where: { userId, isCurrent: true },
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
      userSubscription.canceledAt = null;
      userSubscription.resumesAt = new Date();
      await this.userSubscriptionRepository.save(userSubscription);

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

