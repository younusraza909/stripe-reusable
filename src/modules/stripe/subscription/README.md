# Stripe Subscription Module

A comprehensive NestJS module for managing Stripe subscriptions with dual creation flows, upgrade/downgrade capabilities, and lifecycle management. This module can be easily copied and integrated into any NestJS project.

## Features

- ✅ **Hosted UI Flow** - Checkout Sessions (Stripe handles card collection)
- ✅ **Custom UI Flow** - Direct subscription creation with saved cards
- ✅ **Upgrade Subscription** - Immediate prorated charges/credits
- ✅ **Downgrade Subscription** - Scheduled for next billing cycle
- ✅ **Cancel Subscription** - Immediate or end of period
- ✅ **Resume Subscription** - Undo cancellation
- ✅ **Subscription History** - Track all user subscriptions
- ✅ **Pending Changes** - Schedule downgrades and transitions
- ✅ **Database Tracking** - Complete subscription lifecycle in database
- ✅ **Comprehensive Error Handling**
- ✅ **Standardized API Response Format**
- ✅ **Type-Safe Stripe API Integration**
- ✅ **Swagger Documentation**

## Installation

### 1. Install Dependencies

```bash
npm install stripe @nestjs/typeorm typeorm pg @nestjs/config @nestjs/swagger class-validator class-transformer
```

### 2. Environment Variables

Create a `.env` file with the following variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=your_database

# Optional
NODE_ENV=development
```

## Integration Steps

### 1. Copy Module Files

Copy the subscription module files to your project:

```
src/
  modules/
    stripe/
      stripe.module.ts
      stripe.service.ts
      subscription/
        subscription.module.ts
        subscription.controller.ts
        subscription.service.ts
        entities/
          subscription.entity.ts
          user-subscription.entity.ts
        enums/
          subscription-status.enum.ts
        dto/
          create-subscription-checkout.dto.ts
          create-subscription-intent.dto.ts
          update-subscription.dto.ts
          cancel-subscription.dto.ts
          resume-subscription.dto.ts
  common/
    constant/
      api-response/
        stripe.response.ts
        index.ts
  utils/
    serializer.ts
    index.ts
```

### 2. Configure Database

Update your `app.module.ts`:

```typescript
import { SubscriptionModule } from './modules/stripe/subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    StripeModule,
    SubscriptionModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Seed Subscription Plans

Create subscription plans in your database:

```typescript
// Example seeder or migration
const plans = [
  {
    name: 'Basic Plan',
    stripePriceId: 'price_basic_monthly',
    description: 'Essential features',
    amount: 999, // $9.99
    currency: 'usd',
    interval: 'month',
    features: ['Feature 1', 'Feature 2'],
    isActive: true,
  },
  {
    name: 'Pro Plan',
    stripePriceId: 'price_pro_monthly',
    description: 'Advanced features',
    amount: 1999, // $19.99
    currency: 'usd',
    interval: 'month',
    features: ['All Basic features', 'Feature 3', 'Feature 4'],
    isActive: true,
  },
  {
    name: 'Enterprise Plan',
    stripePriceId: 'price_enterprise_monthly',
    description: 'All features + support',
    amount: 4999, // $49.99
    currency: 'usd',
    interval: 'month',
    features: ['All Pro features', 'Priority support', 'Custom integrations'],
    isActive: true,
  },
];
```

### 4. Update Authentication

Replace the placeholder authentication in `subscription.controller.ts`:

```typescript
// Replace this:
const userId = 1; // Hardcoded for testing

// With your actual user extraction:
const userId = req.user.id; // or however you get user ID
```

### 5. Update User Service

Replace the temporary User module with your actual User service:

```typescript
// In subscription.module.ts, replace:
import { UserModule } from 'src/modules/user/user.module';

// With your actual user module:
import { YourUserModule } from '../your-user/your-user.module';
```

## Subscription Flows

### Flow 1: Hosted UI (Checkout Sessions)

Best for: Quick setup, Stripe handles card collection and setup

**Frontend Flow:**

1. Call create subscription checkout API
2. Redirect user to returned session URL
3. User enters card details on Stripe page
4. Stripe redirects back to success URL
5. Call verify endpoint to check status
6. Backend processes webhook

**Backend Flow:**

1. `POST /stripe/subscriptions/checkout` - Creates Checkout Session
2. Returns session URL
3. User completes payment on Stripe
4. `GET /stripe/subscriptions/verify/:sessionId` - Verifies session
5. Webhook processes subscription activation

### Flow 2: Custom UI (Direct Creation)

Best for: Full control, seamless UX, requires saved cards

**Frontend Flow:**

1. User must have a saved card (Card Module)
2. Call create subscription intent API
3. Receive subscription object
4. Subscription is active immediately

**Backend Flow:**

1. `POST /stripe/subscriptions/intent` - Creates subscription
2. Returns subscription object
3. Webhook confirms subscription status

## API Endpoints

### Create Subscription (Hosted UI)

```http
POST /stripe/subscriptions/checkout
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "priceId": "price_pro_monthly",
  "successUrl": "https://yoursite.com/subscription/success",
  "cancelUrl": "https://yoursite.com/subscription/cancel",
  "metadata": {
    "source": "website"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "cs_test_...",
    "url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "mode": "subscription",
    "status": "open"
  },
  "status": 201,
  "message": "Subscription created successfully"
}
```

### Create Subscription (Custom UI)

```http
POST /stripe/subscriptions/intent
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "priceId": "price_pro_monthly",
  "paymentMethodId": "pm_1234567890abcdef",
  "metadata": {
    "source": "mobile-app"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "sub_1234567890abcdef",
    "status": "active",
    "current_period_end": 1234567890,
    "items": {
      "data": [
        {
          "price": {
            "id": "price_pro_monthly"
          }
        }
      ]
    }
  },
  "status": 201,
  "message": "Subscription created successfully"
}
```

### Get Current Subscription

```http
GET /stripe/subscriptions
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "subscriptionId": 2,
    "stripeSubscriptionId": "sub_1234567890abcdef",
    "status": "active",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "isCurrent": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "subscription": {
      "name": "Pro Plan",
      "amount": 1999,
      "currency": "usd"
    }
  },
  "status": 200,
  "message": "Subscription retrieved successfully"
}
```

### Get All Subscriptions

```http
GET /stripe/subscriptions/history
Authorization: Bearer <your-jwt-token>
```

### Get Available Plans

```http
GET /stripe/subscriptions/plans
```

### Upgrade Subscription (Immediate)

```http
PATCH /stripe/subscriptions/upgrade
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "newPriceId": "price_enterprise_monthly"
}
```

**Response:**

```json
{
  "data": {
    "id": "sub_1234567890abcdef",
    "status": "active",
    "items": {
      "data": [
        {
          "price": {
            "id": "price_enterprise_monthly"
          }
        }
      ]
    }
  },
  "status": 200,
  "message": "Subscription upgraded successfully"
}
```

**Note:** User is charged/credited the prorated difference immediately.

### Downgrade Subscription (Scheduled)

```http
PATCH /stripe/subscriptions/downgrade
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "newPriceId": "price_basic_monthly"
}
```

**Response:**

```json
{
  "data": {
    "id": "sub_1234567890abcdef",
    "status": "active"
  },
  "status": 200,
  "message": "Subscription downgraded successfully"
}
```

**Note:** Downgrade takes effect at the end of current billing cycle.

### Cancel Subscription

```http
POST /stripe/subscriptions/cancel
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "cancelAtPeriodEnd": true
}
```

**Response:**

```json
{
  "data": {
    "id": "sub_1234567890abcdef",
    "cancel_at_period_end": true,
    "status": "active"
  },
  "status": 200,
  "message": "Subscription canceled successfully"
}
```

### Resume Subscription

```http
POST /stripe/subscriptions/resume
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{}
```

**Response:**

```json
{
  "data": {
    "id": "sub_1234567890abcdef",
    "cancel_at_period_end": false,
    "status": "active"
  },
  "status": 200,
  "message": "Subscription resumed successfully"
}
```

### Verify Checkout Session

```http
GET /stripe/subscriptions/verify/:sessionId
```

## Subscription Lifecycle

### Status Flow

```
INCOMPLETE → TRIALING → ACTIVE → CANCELED
            ↓
         PAST_DUE → CANCELED
         PAST_DUE → ACTIVE (if payment retries)
```

### Key States

- **INCOMPLETE**: Subscription created but payment pending
- **TRIALING**: In trial period, not charged yet
- **ACTIVE**: Active and billing
- **PAST_DUE**: Payment failed, retrying
- **CANCELED**: Subscription ended
- **UNPAID**: All retries exhausted

## Database Schema

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  stripe_price_id VARCHAR UNIQUE NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  currency VARCHAR DEFAULT 'usd',
  interval VARCHAR DEFAULT 'month',
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Subscriptions Table

```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  subscription_id INTEGER NOT NULL,
  pending_subscription_id INTEGER,
  stripe_subscription_id VARCHAR UNIQUE NOT NULL,
  status VARCHAR NOT NULL,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  resumes_at TIMESTAMP,
  is_paused BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT FALSE,
  scheduled_change_at TIMESTAMP,
  stripe_subscription_schedule_id VARCHAR,
  invoice_id VARCHAR,
  payment_method_last4 VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (pending_subscription_id) REFERENCES subscriptions(id)
);
```

## Webhook Setup

### 1. Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set URL: `https://yourdomain.com/stripe/webhooks`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 2. Implement Webhook Handlers

The module includes commented TODO notes in `webhook.service.ts`. Implement:

- `handleSubscriptionCreated`: Activate subscription, set isCurrent
- `handleSubscriptionUpdated`: Sync status changes, handle schedules
- `handleSubscriptionDeleted`: Mark as CANCELED, set isCurrent=false
- `handleInvoicePaymentSucceeded`: Update payment details
- `handleInvoicePaymentFailed`: Mark as PAST_DUE

See `webhook.service.ts` for detailed implementation notes.

## Testing

### Test Cards (Stripe Test Mode)

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000002500003155`

### Test Subscription Flow

```bash
# 1. Create subscription via Checkout
curl -X POST http://localhost:3000/stripe/subscriptions/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_test_monthly",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'

# 2. Upgrade subscription
curl -X PATCH http://localhost:3000/stripe/subscriptions/upgrade \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPriceId": "price_test_pro_monthly"}'

# 3. Downgrade subscription
curl -X PATCH http://localhost:3000/stripe/subscriptions/downgrade \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPriceId": "price_test_monthly"}'

# 4. Cancel subscription
curl -X POST http://localhost:3000/stripe/subscriptions/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cancelAtPeriodEnd": true}'
```

## Customization Points

When integrating this module, you'll need to customize:

1. **User Entity**: Add `stripeCustomerId` field if not present
2. **Authentication**: Replace placeholder auth guards
3. **User Service**: Replace temporary user service
4. **Subscription Plans**: Seed with your actual Stripe price IDs
5. **Response Format**: Customize response constants
6. **Validation**: Add any additional validation rules
7. **Authorization**: Implement proper access controls
8. **Error Messages**: Customize error messages in constants
9. **Webhook Logic**: Implement subscription webhook handlers
10. **Email Notifications**: Add subscription lifecycle emails

## Security Considerations

1. **Environment Variables**: Never commit Stripe keys
2. **Authentication**: Implement proper JWT or session-based auth
3. **Validation**: All inputs validated using class-validator
4. **Webhooks**: Always verify webhook signatures
5. **PCI Compliance**: Card data handled by Stripe only
6. **Subscription Access**: Verify users can only manage their own subscriptions

## Support

For issues or questions:

1. Check the TODO comments in the code
2. Review the Stripe documentation
3. Ensure all environment variables are set
4. Verify database connection and entities
5. Check webhook configuration in Stripe Dashboard

## License

This module is part of the reusable library project and follows the same license terms.
