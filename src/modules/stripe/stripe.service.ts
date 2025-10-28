import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { User } from '../user/entities/user.entity';

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not configured. Please set it in your environment variables.',
      );
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });
  }

  getStripeClient(): Stripe {
    if (!this.stripe) {
      throw new Error(
        'Stripe client not initialized. Make sure STRIPE_SECRET_KEY is configured.',
      );
    }
    return this.stripe;
  }

  async getOrCreateStripeCustomer(user: User): Promise<Stripe.Customer> {
    const stripe = this.getStripeClient();

    if (user.stripeCustomerId) {
      try {
        return (await stripe.customers.retrieve(
          user.stripeCustomerId,
        )) as Stripe.Customer;
      } catch (error) {
        // Customer doesn't exist, create new one
      }
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: {
        // add metadata to the customer
        userId: user.id.toString(),
      },
    });

    return customer;
  }
}
