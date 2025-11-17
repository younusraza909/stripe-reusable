import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeModule } from './modules/stripe/stripe.module';
import { CardModule } from './modules/stripe/card/card.module';
import { WebhookModule } from './modules/stripe/webhook/webhook.module';
import { InvoiceModule } from './modules/stripe/invoice/invoice.module';
import { PaymentModule } from './modules/stripe/payment/payment.module';
import { SubscriptionModule } from './modules/stripe/subscription/subscription.module';
import { UserModule } from './modules/user/user.module';
import { PaypalModule } from './modules/paypal/paypal.module';
import { PaypalPaymentModule } from './modules/paypal/payment/payment.module';
import { PaypalInvoiceModule } from './modules/paypal/invoice/invoice.module';
import { PaypalSubscriptionModule } from './modules/paypal/subscription/subscription.module';
import { PaypalWebhookModule } from './modules/paypal/webhook/webhook.module';

/**
 * Main application module.
 * TODO: Configure database connection with your own credentials.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ||
        'mongodb+srv://raza:raza@cluster0.nyby9t1.mongodb.net/',
    ),
    StripeModule,
    CardModule,
    WebhookModule,
    InvoiceModule,
    PaymentModule,
    SubscriptionModule,
    PaypalModule,
    PaypalPaymentModule,
    PaypalInvoiceModule,
    PaypalSubscriptionModule,
    PaypalWebhookModule,
    UserModule, // Temporary for testing only
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
