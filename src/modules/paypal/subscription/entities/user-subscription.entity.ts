import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { PaypalSubscription } from './subscription.entity';
import { PaypalSubscriptionStatusEnum } from '../enums/subscription-status.enum';

@Entity('paypal_user_subscriptions')
export class PaypalUserSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => PaypalSubscription, { eager: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: PaypalSubscription;

  @Column()
  subscriptionId: number;

  @Column({ nullable: true })
  pendingSubscriptionId: number;

  @ManyToOne(() => PaypalSubscription, { eager: true, nullable: true })
  @JoinColumn({ name: 'pendingSubscriptionId' })
  pendingSubscription: PaypalSubscription;

  @Column({ unique: true })
  paypalSubscriptionId: string;

  @Column({
    type: 'enum',
    enum: PaypalSubscriptionStatusEnum,
    default: PaypalSubscriptionStatusEnum.APPROVAL_PENDING,
  })
  status: PaypalSubscriptionStatusEnum;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resumesAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isPaused: boolean;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledChangeAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paypalSubscriptionScheduleId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  invoiceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentMethodReference: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

