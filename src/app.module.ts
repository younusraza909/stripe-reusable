import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeModule } from './modules/stripe/stripe.module';
import { CardModule } from './modules/stripe/card/card.module';
import { UserModule } from './modules/user/user.module';

/**
 * Main application module.
 * TODO: Configure database connection with your own credentials.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'reusable-stripe',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production', // Only for development
      // TODO: Replace with your actual database configuration
    }),
    StripeModule,
    CardModule,
    UserModule, // Temporary for testing only
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
