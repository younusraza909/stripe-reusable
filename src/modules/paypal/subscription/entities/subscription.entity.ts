import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * PayPal subscription plan entity for storing available billing plans.
 * TODO: Seed this table with your PayPal billing plans.
 */
@Entity('paypal_subscriptions')
export class PaypalSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  paypalPlanId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'MONTH' })
  interval: string;

  @Column({ type: 'json', nullable: true })
  features: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
