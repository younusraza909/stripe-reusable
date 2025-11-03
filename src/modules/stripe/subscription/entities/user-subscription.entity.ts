import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { SubscriptionStatusEnum } from '../enums/subscription-status.enum';

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Subscription, { eager: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column()
  subscriptionId: number;

  @ManyToOne(() => Subscription, { eager: true, nullable: true })
  @JoinColumn({ name: 'pendingSubscriptionId' })
  pendingSubscription: Subscription;

  @Column({ nullable: true })
  pendingSubscriptionId: number;

  @Column({ unique: true })
  stripeSubscriptionId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatusEnum,
    default: SubscriptionStatusEnum.INCOMPLETE,
  })
  status: SubscriptionStatusEnum;

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
  stripeSubscriptionScheduleId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  invoiceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentMethodLast4: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
