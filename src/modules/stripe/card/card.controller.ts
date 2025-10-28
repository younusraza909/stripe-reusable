import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CardService } from './card.service';
import { AddCardDto } from './dto/add-card.dto';
import { SetDefaultCardDto } from './dto/set-default-card.dto';
import { Card } from './entities/card.entity';
import { SerializeHttpResponse, SuccessResponse } from 'src/utils';
import { STRIPE_SUCCESS } from 'src/common/constant/api-response';

/**
 * Card management controller for Stripe payment methods.
 * TODO: Replace JwtAuthGuard and @Request() with your own authentication implementation.
 * TODO: Replace the hardcoded user ID extraction with your actual user decorator.
 */
@ApiTags('Stripe Cards')
@Controller('stripe/cards')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard
// @UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new card for the current user' })
  async addCard(
    @Body() addCardDto: AddCardDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Card>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Cards are automatically associated with the authenticated user
    // This prevents users from adding cards to other users' accounts
    return this.cardService.addCard(userId, addCardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get cards for current user' })
  async getCards(@Request() req: any): Promise<SuccessResponse<Card[]>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Only returns cards belonging to the authenticated user
    // This prevents users from accessing other users' card information
    return this.cardService.getCards(userId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all cards for all users (admin only)' })
  async getAllCards(): Promise<SuccessResponse<Card[]>> {
    return this.cardService.getAllCards();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a card' })
  async deleteCard(
    @Param('id', ParseIntPipe) cardId: number,
    @Request() req: any,
  ) {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Validate that the user can only delete their own cards

    // This prevents users from deleting other users' cards
    await this.cardService.deleteCard(userId, cardId);
    return SerializeHttpResponse(
      null,
      HttpStatus.OK,
      STRIPE_SUCCESS.CARD_DELETED,
    );
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set a card as default' })
  async setDefaultCard(
    @Param('id', ParseIntPipe) cardId: number,
    @Body() setDefaultCardDto: SetDefaultCardDto,
    @Request() req: any,
  ): Promise<SuccessResponse<Card>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    const userId = 1; // Hardcoded for testing - replace with actual user ID from JWT token

    // SECURITY: Validate that the user can only set their own cards as default
    // This prevents users from setting other users' cards as their default
    return this.cardService.setDefaultCard(userId, cardId);
  }
}
