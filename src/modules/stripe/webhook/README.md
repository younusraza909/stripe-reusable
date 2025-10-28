# Stripe Webhook Module

A simple NestJS module for handling Stripe webhook events. This module provides a basic webhook listener with empty controller methods that you can implement with your own business logic.

## Features

- ✅ Webhook signature verification for security
- ✅ Support for major Stripe webhook events
- ✅ Empty controller methods ready for implementation
- ✅ Comprehensive error handling and validation
- ✅ Swagger/OpenAPI documentation
- ✅ TypeScript support with Stripe types

## Supported Events

- `checkout.session.completed` - Checkout session completed
- `customer.subscription.updated` - Subscription updated
- `invoice.payment_failed` - Payment failed
- `*` - Unhandled events (catch-all)

## Installation

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Get this from Stripe Dashboard > Webhooks

# Database Configuration (if using TypeORM)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=your_database

# Optional
NODE_ENV=development
```

### 2. Stripe Webhook Setup

1. Go to your Stripe Dashboard
2. Navigate to Developers > Webhooks
3. Click "Add endpoint"
4. Set the endpoint URL to: `https://yourdomain.com/stripe/webhooks`
5. Select the events you want to handle:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
   - Add any other events you need
6. Copy the webhook signing secret to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Usage

### Webhook Endpoint

The webhook endpoint is automatically available at:

```
POST /stripe/webhooks
```

### Raw Body Configuration

**Important**: The webhook endpoint requires the raw request body for signature verification. Add this to your `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure raw body for webhook signature verification
  app.use('/stripe/webhooks', (req, res, next) => {
    if (req.originalUrl === '/stripe/webhooks') {
      req.rawBody = req.body;
    }
    next();
  });

  await app.listen(3000);
}
bootstrap();
```

### Implementing Event Handlers

Each event has a corresponding empty method in the `WebhookService` that you can implement:

```typescript
// Example: Checkout Session Completed Handler
async handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // TODO: Implement your checkout completion logic here
  // Example:
  // - Update order status in database
  // - Send confirmation email
  // - Grant access to purchased items
  // - Update user subscription status
}
```

## File Structure

```
src/modules/stripe/webhook/
├── webhook.module.ts           # Module configuration
├── webhook.controller.ts       # Webhook endpoint controller
├── webhook.service.ts          # Empty event handler methods
└── README.md                   # This file
```

## Available Event Handlers

### 1. Checkout Events

- `handleCheckoutSessionCompleted(event)` - Checkout session completed

### 2. Subscription Events

- `handleSubscriptionUpdated(event)` - Subscription updated

### 3. Payment Events

- `handlePaymentFailed(event)` - Payment failed

### 4. Utility Events

- `handleUnhandledEvent(event)` - Catch-all for unhandled events

## Response Format

All webhook responses return a simple success response:

```json
{
  "received": true
}
```

Error responses follow the standardized format:

```json
{
  "data": null,
  "status": 400,
  "message": "Webhook signature verification failed"
}
```

## Security

### Webhook Signature Verification

The module automatically verifies webhook signatures using Stripe's webhook secret:

```typescript
// Signature verification is enabled by default
// Set STRIPE_WEBHOOK_SECRET in your environment variables
```

### Environment Variables Required

Make sure you have these environment variables set:

```env
STRIPE_SECRET_KEY=sk_test_... # Required for Stripe client initialization
STRIPE_WEBHOOK_SECRET=whsec_... # Required for webhook signature verification
```

## Customization

### Adding New Event Handlers

1. Add the event type to the switch statement in `webhook.controller.ts`
2. Create a new handler method in `webhook.service.ts`
3. Implement your business logic

### Example: Adding a New Event

```typescript
// In webhook.controller.ts
case 'customer.subscription.created':
  await this.webhookService.handleSubscriptionCreated(event);
  break;

// In webhook.service.ts
async handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // TODO: Implement your subscription creation logic
  // - Create subscription record in database
  // - Grant access to subscription features
  // - Send welcome email
  // - Update user subscription status
}
```
