import { Controller, Post, Get, Body, Param, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaypalInvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { Serialized, SuccessResponse } from 'src/utils';

/**
 * Invoice management controller for PayPal invoices.
 * Mirrors the Stripe invoice controller where possible.
 */
@ApiTags('PayPal Invoices')
@Controller('paypal/invoices')
@ApiBearerAuth()
// TODO: Replace with your actual authentication guard
// @UseGuards(JwtAuthGuard)
export class PaypalInvoiceController {
  constructor(private readonly invoiceService: PaypalInvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new PayPal invoice' })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
  ): Promise<SuccessResponse<Record<string, any>>> {
    return this.invoiceService.createInvoice(createInvoiceDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PayPal invoice by ID' })
  @ApiParam({
    name: 'id',
    description: 'PayPal invoice ID',
    example: 'INV2-5R7J-GM8A-4N9Q-2V4Q',
  })
  async getInvoiceById(
    @Param('id') invoiceId: string,
  ): Promise<
    | Serialized<Record<string, any>, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.invoiceService.getInvoiceById(invoiceId);
  }

  /**
   * Record a manual payment for a PayPal invoice.
   */
  @Post('pay/:id')
  @ApiOperation({
    summary: 'Record manual payment for PayPal invoice',
  })
  @ApiParam({
    name: 'id',
    description: 'PayPal invoice ID to record payment for',
    example: 'INV2-5R7J-GM8A-4N9Q-2V4Q',
  })
  async recordManualPayment(
    @Param('id') invoiceId: string,
    @Body() body: PayInvoiceDto,
  ): Promise<
    | Serialized<Record<string, any>, HttpStatus.OK>
    | Serialized<null, HttpStatus.BAD_REQUEST>
  > {
    return this.invoiceService.recordManualPayment(invoiceId, body);
  }
}
