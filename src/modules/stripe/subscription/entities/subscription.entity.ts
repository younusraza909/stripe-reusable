import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Subscription Plan entity for storing available subscription plans.
 * This entity represents the catalog of subscription plans available to users.
 * TODO: Seed this table with your subscription plans from Stripe.
 */
@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  stripePriceId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({ default: 'month' })
  interval: string; // 'month' or 'year'

  @Column({ type: 'json', nullable: true })
  features: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

