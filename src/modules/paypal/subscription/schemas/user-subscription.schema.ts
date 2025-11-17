import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';
import { PaypalSubscription } from './subscription.schema';
import { PaypalSubscriptionStatusEnum } from '../enums/subscription-status.enum';

export type PaypalUserSubscriptionDocument = PaypalUserSubscription & Document;

@Schema({ timestamps: true })
export class PaypalUserSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PaypalSubscription', required: true })
  subscriptionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PaypalSubscription', required: false })
  pendingSubscriptionId?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  paypalSubscriptionId: string;

  @Prop({
    type: String,
    enum: PaypalSubscriptionStatusEnum,
    default: PaypalSubscriptionStatusEnum.APPROVAL_PENDING,
  })
  status: PaypalSubscriptionStatusEnum;

  @Prop({ required: false })
  currentPeriodEnd?: Date;

  @Prop({ required: false })
  canceledAt?: Date;

  @Prop({ required: false })
  resumesAt?: Date;

  @Prop({ default: false })
  isPaused: boolean;

  @Prop({ default: false })
  isCurrent: boolean;

  @Prop({ required: false })
  scheduledChangeAt?: Date;

  @Prop({ required: false })
  paypalSubscriptionScheduleId?: string;

  @Prop({ required: false })
  invoiceId?: string;

  @Prop({ required: false })
  paymentMethodReference?: string;
}

export const PaypalUserSubscriptionSchema = SchemaFactory.createForClass(
  PaypalUserSubscription,
);
