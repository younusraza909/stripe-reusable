import { Module, forwardRef } from '@nestjs/common';
import { PaypalModule } from '../paypal.module';
import { PaypalInvoiceService } from './invoice.service';
import { PaypalInvoiceController } from './invoice.controller';
import { UserModule } from 'src/modules/user/user.module';

/**
 * Invoice module for managing PayPal invoices.
 * Mirrors Stripe invoice module while leveraging PayPal Invoicing API.
 */
@Module({
  imports: [PaypalModule, forwardRef(() => UserModule)],
  providers: [PaypalInvoiceService],
  controllers: [PaypalInvoiceController],
  exports: [PaypalInvoiceService],
})
export class PaypalInvoiceModule {}

