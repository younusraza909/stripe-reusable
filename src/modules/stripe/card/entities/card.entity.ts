import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';

/**
 * Card entity for storing Stripe card metadata.
 * TODO: Replace userId foreign key with your actual User entity reference.
 * This entity stores only metadata - actual card details are fetched from Stripe API.
 */
@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ unique: true })
  stripePaymentMethodId: string;

  @Column()
  last4: string;

  @Column()
  brand: string;

  @Column()
  expiryMonth: number;

  @Column()
  expiryYear: number;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // TODO: Replace this relation with your actual User entity
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
