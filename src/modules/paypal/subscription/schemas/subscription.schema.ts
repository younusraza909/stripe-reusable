import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * PayPal subscription plan schema for storing available billing plans.
 * TODO: Seed this collection with your PayPal billing plans.
 */
export type PaypalSubscriptionDocument = PaypalSubscription & Document;

@Schema({ timestamps: true })
export class PaypalSubscription {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  paypalPlanId: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 'MONTH' })
  interval: string;

  @Prop({ type: [String], required: false })
  features?: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const PaypalSubscriptionSchema =
  SchemaFactory.createForClass(PaypalSubscription);
