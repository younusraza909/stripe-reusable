import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeModule } from '../stripe.module';
import { Card } from './entities/card.entity';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { UserModule } from 'src/modules/user/user.module';

/**
 * Card module for managing Stripe payment methods.
 * This module handles card operations (add, retrieve, delete, set default).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Card]),
    StripeModule,
    forwardRef(() => UserModule), // TODO: Replace with your actual User module
  ],
  providers: [CardService],
  controllers: [CardController],
  exports: [CardService],
})
export class CardModule {}
