import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe.service';
import { Card } from './entities/card.entity';
import { AddCardDto } from './dto/add-card.dto';
import Stripe from 'stripe';
import { UserService } from 'src/modules/user/user.service';
import { User } from 'src/modules/user/entities/user.entity';
import {
  SerializeHttpResponse,
  SerializeHttpError,
  SuccessResponse,
} from 'src/utils';
import {
  STRIPE_SUCCESS,
  STRIPE_ERRORS,
} from 'src/common/constant/api-response';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    private readonly stripeService: StripeService,
    private readonly userService: UserService,
  ) {}

  async addCard(
    userId: number,
    addCardDto: AddCardDto,
  ): Promise<SuccessResponse<Card>> {
    const user = await this.userService.findById(userId);

    // TODO: Ensure your User entity has a stripeCustomerId field (nullable string)
    if (!user.stripeCustomerId) {
      // Create or get Stripe customer
      const stripeCustomer =
        await this.stripeService.getOrCreateStripeCustomer(user);
      user.stripeCustomerId = stripeCustomer.id;
      await this.userService.updateStripeCustomerId(userId, stripeCustomer.id);
    }

    const stripe = this.stripeService.getStripeClient();

    try {
      await stripe.paymentMethods.attach(addCardDto.paymentMethodId, {
        customer: user.stripeCustomerId,
      });
    } catch (attachError) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.PAYMENT_METHOD_ATTACHMENT_FAILED,
      );
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(
      addCardDto.paymentMethodId,
    );

    if (paymentMethod.type !== 'card') {
      throw new BadRequestException(
        SerializeHttpError(
          null,
          HttpStatus.BAD_REQUEST,
          STRIPE_ERRORS.INVALID_PAYMENT_METHOD,
        ),
      );
    }

    const card = paymentMethod.card;
    if (!card) {
      throw new BadRequestException(
        SerializeHttpError(
          null,
          HttpStatus.BAD_REQUEST,
          STRIPE_ERRORS.PAYMENT_METHOD_NOT_FOUND,
        ),
      );
    }

    // Check if a card with the same fingerprint already exists for this user
    const existingCards = await this.cardRepository.find({
      where: { userId },
    });

    // Get all payment methods for this user to check fingerprints
    const userPaymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    // Check if any existing card has the same fingerprint
    const duplicateCard = userPaymentMethods.data.find(
      (pm) => pm.card?.fingerprint === card.fingerprint,
    );

    if (duplicateCard) {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.DUPLICATE_CARD,
      );
    }

    const isDefault = existingCards.length === 0;

    // Create card record in database
    const cardEntity = this.cardRepository.create({
      userId,
      stripePaymentMethodId: addCardDto.paymentMethodId,
      last4: card.last4,
      brand: card.brand,
      expiryMonth: card.exp_month,
      expiryYear: card.exp_year,
      isDefault,
    });

    const savedCard = await this.cardRepository.save(cardEntity);

    // If this is the default card, update Stripe customer
    if (isDefault) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: addCardDto.paymentMethodId,
        },
      });
    }

    return SerializeHttpResponse(
      savedCard,
      HttpStatus.CREATED,
      STRIPE_SUCCESS.CARD_ADDED,
    );
  }

  async getCards(userId: number): Promise<SuccessResponse<Card[]>> {
    const cards = await this.cardRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return SerializeHttpResponse(
      cards,
      HttpStatus.OK,
      STRIPE_SUCCESS.CARDS_RETRIEVED,
    );
  }

  async getAllCards(): Promise<SuccessResponse<Card[]>> {
    const cards = await this.cardRepository.find({
      order: { userId: 'ASC', isDefault: 'DESC', createdAt: 'DESC' },
      relations: ['user'],
    });

    return SerializeHttpResponse(
      cards,
      HttpStatus.OK,
      STRIPE_SUCCESS.CARDS_RETRIEVED,
    );
  }

  async deleteCard(
    userId: number,
    cardId: number,
  ): Promise<SuccessResponse<null>> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(
        SerializeHttpError(
          null,
          HttpStatus.NOT_FOUND,
          STRIPE_ERRORS.CARD_NOT_FOUND,
        ),
      );
    }

    const user = await this.userService.findById(userId);
    const stripe = this.stripeService.getStripeClient();

    // Check if payment method is attached before trying to detach
    const isAttached = user.stripeCustomerId
      ? await this.isPaymentMethodAttached(
          card.stripePaymentMethodId,
          user.stripeCustomerId,
        )
      : false;

    if (isAttached) {
      try {
        await stripe.paymentMethods.detach(card.stripePaymentMethodId);
      } catch (stripeError) {
        return SerializeHttpError(
          null,
          HttpStatus.BAD_REQUEST,
          STRIPE_ERRORS.PAYMENT_METHOD_DETACHMENT_FAILED,
        );
      }
    } else {
      return SerializeHttpError(
        null,
        HttpStatus.BAD_REQUEST,
        STRIPE_ERRORS.PAYMENT_METHOD_NOT_ATTACHED,
      );
    }

    // If this was the default card, find another card to make default
    if (card.isDefault) {
      // Get remaining cards for this user (excluding the one being deleted)
      const remainingCards = await this.cardRepository.find({
        where: { userId },
      });

      // Filter out the card being deleted
      const otherCards = remainingCards.filter((c) => c.id !== cardId);

      if (otherCards.length > 0) {
        // Set the first remaining card as default
        const newDefaultCard = otherCards[0];
        newDefaultCard.isDefault = true;
        await this.cardRepository.save(newDefaultCard);

        // Update Stripe customer default payment method
        if (user.stripeCustomerId) {
          try {
            await stripe.customers.update(user.stripeCustomerId, {
              invoice_settings: {
                default_payment_method: newDefaultCard.stripePaymentMethodId,
              },
            });
          } catch (stripeError) {
            return SerializeHttpError(
              null,
              HttpStatus.BAD_REQUEST,
              STRIPE_ERRORS.CUSTOMER_UPDATE_FAILED,
            );
          }
        }
      } else if (user.stripeCustomerId) {
        // No cards left, remove default payment method
        try {
          await stripe.customers.update(user.stripeCustomerId, {
            invoice_settings: {
              default_payment_method: undefined,
            },
          });
        } catch (stripeError) {
          return SerializeHttpError(
            null,
            HttpStatus.BAD_REQUEST,
            STRIPE_ERRORS.CUSTOMER_UPDATE_FAILED,
          );
        }
      }
    }

    // Delete card from database
    await this.cardRepository.remove(card);
    return SerializeHttpResponse(
      null,
      HttpStatus.OK,
      STRIPE_SUCCESS.CARD_DELETED,
    );
  }

  async setDefaultCard(
    userId: number,
    cardId: number,
  ): Promise<SuccessResponse<Card>> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(
        SerializeHttpError(
          null,
          HttpStatus.NOT_FOUND,
          STRIPE_ERRORS.CARD_NOT_FOUND,
        ),
      );
    }

    const user = await this.userService.findById(userId);
    const stripe = this.stripeService.getStripeClient();

    // Update all cards to not be default
    await this.cardRepository.update({ userId }, { isDefault: false });

    // Set this card as default
    card.isDefault = true;
    const updatedCard = await this.cardRepository.save(card);

    // Update Stripe customer default payment method
    if (user.stripeCustomerId) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: card.stripePaymentMethodId,
        },
      });
    }

    return SerializeHttpResponse(
      updatedCard,
      HttpStatus.OK,
      STRIPE_SUCCESS.CARD_SET_DEFAULT,
    );
  }

  private async isPaymentMethodAttached(
    paymentMethodId: string,
    customerId: string,
  ): Promise<boolean> {
    try {
      const stripe = this.stripeService.getStripeClient();
      const paymentMethod =
        await stripe.paymentMethods.retrieve(paymentMethodId);
      return paymentMethod.customer === customerId;
    } catch (error) {
      return false;
    }
  }
}
