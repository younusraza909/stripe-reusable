import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: false })
  stripeCustomerId?: string;

  @Prop({ required: false })
  paypalPayerId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
