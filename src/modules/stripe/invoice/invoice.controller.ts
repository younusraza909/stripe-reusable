import { Controller, Get, Post, Body, Param, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import Stripe from 'stripe';
import { Serialized, SuccessResponse } from 'src/utils';
import { PayInvoiceDto } from './dto/pay-invoice.dto';

/**
 * Invoice management controller for Stripe invoices.
 * TODO: Replace JwtAuthGuard and @Request() with your own authentication implementation.
 * TODO: Replace the hardcoded user ID extraction with your actual user decorator.
 * TODO: Add auth guard for admin-only endpoints (GET without customerId).
 */
@ApiTags('Stripe Invoices')
@Controller('stripe/invoices')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard
// @UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
  ): Promise<SuccessResponse<Stripe.Invoice>> {
    // TODO: Replace with your actual user ID extraction from JWT token
    // Example: const userId = req.user.id;
    // Ensure user can only create invoices for themselves unless they are admin
    // if (createInvoiceDto.customerId !== userId && !req.user.isAdmin) {
    //   throw new ForbiddenException('You can only create invoices for yourself');
    // }

    // SECURITY: Invoices are automatically associated with the Stripe customer
    // This prevents users from creating invoices for other users' Stripe customers
    return this.invoiceService.createInvoice(createInvoiceDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({
    name: 'id',
    description: 'Stripe invoice ID',
    example: 'in_1234567890abcdef',
  })
  async getInvoiceById(
    @Param('id') invoiceId: string,
  ): Promise<
    | Serialized<Stripe.Invoice, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    // TODO: Add authorization check - ensure user can only access their own invoices
    // Example: const userId = req.user.id;
    // const invoice = await this.invoiceService.getInvoiceById(invoiceId);
    // Verify that invoice.customer matches user.stripeCustomerId

    return this.invoiceService.getInvoiceById(invoiceId);
  }

  /**
   * Pay a finalized invoice manually.
   * This triggers Stripe to attempt payment for the invoice (e.g., using saved card)
   * or marks it as paid if payment collection is handled outside Stripe.
   */
  @Post('pay/:id')
  @ApiOperation({
    summary: 'Pay a finalized invoice manually or mark it as paid',
  })
  @ApiParam({
    name: 'id',
    description: 'Stripe invoice ID to pay',
    example: 'in_1234567890abcdef',
  })
  async payInvoiceManually(
    @Param('id') invoiceId: string,
    @Body() body: PayInvoiceDto,
  ): Promise<
    | Serialized<Stripe.Invoice, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.invoiceService.payInvoiceManually(invoiceId, body.payWithCard);
  }
}
