# Stripe One-Time Payment Module

A reusable NestJS module for managing one-time Stripe payments with dual payment flows:

1. **Custom UI Flow** - Payment Intents with Stripe Elements (client-side card handling)
2. **Redirect Flow** - Checkout Sessions (Stripe hosted payment page)

Both flows support authenticated users and guest payments, with webhook + frontend verification for reliability.

## Features

- ✅ Payment Intent API for custom UI integration
- ✅ Checkout Session API for redirect payments
- ✅ Support for authenticated users and guest payments
- ✅ Comprehensive error handling
- ✅ Standardized API response format
- ✅ Reusable serializer utility
- ✅ Type-safe Stripe API integration
- ✅ Consistent error messaging

## Installation

### 1. Install Dependencies

```bash
npm install stripe @nestjs/config @nestjs/swagger class-validator class-transformer
```

### 2. Environment Variables

Create a `.env` file with the following variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database Configuration (PostgreSQL) - Optional
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

Copy the payment module files to your project:

```
src/
  modules/
    stripe/
      stripe.module.ts
      stripe.service.ts
      payment/
        payment.module.ts
        payment.controller.ts
        payment.service.ts
        dto/
          create-payment-intent.dto.ts
          create-checkout-session.dto.ts
          confirm-payment.dto.ts
          verify-session.dto.ts
  common/
    constant/
      api-response/
        stripe.response.ts
        index.ts
  utils/
    serializer.ts
    index.ts
```

### 2. Update App Module

Add PaymentModule to your `app.module.ts`:

```typescript
import { PaymentModule } from './modules/stripe/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StripeModule,
    PaymentModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Update Authentication

Replace the placeholder authentication in `payment.controller.ts`:

```typescript
// Replace:
const userId = 1; // Hardcoded for testing

// With your actual user extraction:
const userId = req.user?.id; // Optional - undefined for guests
```

### 4. Update User Service

Replace the temporary User module with your actual User service:

```typescript
// In payment.module.ts, replace:
import { UserModule } from 'src/modules/user/user.module';

// With your actual user module:
import { YourUserModule } from '../your-user/your-user.module';
```

## Payment Flows

### Flow 1: Custom UI with Stripe Elements (Payment Intent)

Best for: Full control over payment UI, seamless user experience

**Frontend Flow:**

1. Create payment intent via API
2. Use `client_secret` with Stripe Elements
3. User enters card details in your UI
4. Confirm payment with Stripe.js
5. Call verify endpoint to get status
6. Backend processes webhook in background

**Backend Flow:**

1. `POST /stripe/payments/intent` - Creates Payment Intent
2. Returns `client_secret` for Stripe Elements
3. Frontend confirms payment
4. `GET /stripe/payments/intent/:id` - Verifies payment
5. Webhook processes fulfillment

### Flow 2: Redirect to Stripe (Checkout Session)

Best for: Quick setup, PCI compliance, multiple payment methods

**Frontend Flow:**

1. Create checkout session via API
2. Redirect user to `session.url`
3. User completes payment on Stripe page
4. Stripe redirects back with `session_id`
5. Call verify-session endpoint
6. Backend processes webhook in background

**Backend Flow:**

1. `POST /stripe/payments/checkout` - Creates Checkout Session
2. Returns `url` for redirect
3. User redirected to Stripe
4. `GET /stripe/payments/verify-session/:sessionId` - Verifies payment
5. Webhook processes fulfillment

## API Endpoints

### Create Payment Intent (Custom UI)

```http
POST /stripe/payments/intent
Authorization: Bearer <your-jwt-token> (optional)
Content-Type: application/json

{
  "amount": 2000,
  "currency": "usd",
  "description": "Product purchase",
  "metadata": {
    "orderId": "ORD-123",
    "productId": "PROD-456"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "pi_1234567890abcdef",
    "object": "payment_intent",
    "amount": 2000,
    "currency": "usd",
    "status": "requires_payment_method",
    "client_secret": "pi_1234567890abcdef_secret_xyz",
    "description": "Product purchase"
  },
  "status": 201,
  "message": "Payment intent created successfully"
}
```

### Retrieve Payment Intent

```http
GET /stripe/payments/intent/:id
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "data": {
    "id": "pi_1234567890abcdef",
    "object": "payment_intent",
    "amount": 2000,
    "currency": "usd",
    "status": "succeeded",
    "payment_method": "pm_1234567890abcdef",
    "charges": {
      "data": [...]
    }
  },
  "status": 200,
  "message": "Payment intent retrieved successfully"
}
```

### Create Checkout Session (Redirect)

```http
POST /stripe/payments/checkout
Authorization: Bearer <your-jwt-token> (optional)
Content-Type: application/json

{
  "amount": 2000,
  "currency": "usd",
  "description": "Product purchase",
  "successUrl": "https://yoursite.com/payment/success",
  "cancelUrl": "https://yoursite.com/payment/cancel",
  "metadata": {
    "orderId": "ORD-123",
    "productId": "PROD-456"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "cs_test_a1234567890abcdef",
    "object": "checkout.session",
    "url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "amount_total": 2000,
    "currency": "usd",
    "payment_status": "unpaid",
    "status": "open"
  },
  "status": 201,
  "message": "Checkout session created successfully"
}
```

### Verify Checkout Session

```http
GET /stripe/payments/verify-session/:sessionId
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "data": {
    "id": "cs_test_a1234567890abcdef",
    "object": "checkout.session",
    "payment_status": "paid",
    "customer_email": "customer@example.com",
    "payment_intent": "pi_1234567890abcdef",
    "amount_total": 2000,
    "currency": "usd"
  },
  "status": 200,
  "message": "Session verified successfully"
}
```

## Authenticated vs Guest Payments

### Authenticated Users

- User is logged in with JWT token
- Payment is linked to `user.stripeCustomerId`
- Automatic customer creation if needed
- Payment history accessible via Stripe Dashboard
- Optional: Guest payments with `guestEmail`

Example request:

```javascript
fetch('/stripe/payments/intent', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${jwtToken}`, // User is authenticated
  },
  body: JSON.stringify({
    amount: 2000,
    currency: 'usd',
    description: 'Product purchase',
  }),
});
```

### Guest Payments

- User is NOT logged in (no JWT token)
- Must provide `guestEmail` in request body
- Creates one-time customer or uses email only
- Payment history accessible via Stripe Dashboard

Example request:

```javascript
fetch('/stripe/payments/intent', {
  method: 'POST',
  // No Authorization header
  body: JSON.stringify({
    amount: 2000,
    currency: 'usd',
    description: 'Product purchase',
    guestEmail: 'customer@example.com', // Required for guests
  }),
});
```

## Webhook Setup

### 1. Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set URL: `https://yourdomain.com/stripe/webhooks`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 2. Implement Webhook Handler

The module includes a placeholder webhook handler in `webhook.service.ts`. Implement your fulfillment logic:

```typescript
async handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentIntent = session.payment_intent;
  const customerEmail = session.customer_email;
  const metadata = session.metadata;

  // Your fulfillment logic:
  // - Grant access to purchased items
  // - Update order status
  // - Send confirmation email
  // - Log transaction
}
```

### Webhook vs Frontend Verification

- **Webhook**: Source of truth, processes even if user closes browser
- **Frontend Verification**: Immediate UX feedback after payment
- Both are used together for reliability and UX

## Response Format

All API responses follow a standardized format:

```json
{
  "data": <actual_data>,
  "status": <http_status_code>,
  "message": "<message>"
}
```

### Response Constants

```typescript
// Success messages
STRIPE_SUCCESS.PAYMENT_INTENT_CREATED = 'Payment intent created successfully';
STRIPE_SUCCESS.PAYMENT_INTENT_RETRIEVED =
  'Payment intent retrieved successfully';
STRIPE_SUCCESS.CHECKOUT_SESSION_CREATED =
  'Checkout session created successfully';
STRIPE_SUCCESS.SESSION_VERIFIED = 'Session verified successfully';
STRIPE_SUCCESS.PAYMENT_SUCCEEDED = 'Payment completed successfully';

// Error messages
STRIPE_ERRORS.PAYMENT_INTENT_CREATION_FAILED =
  'Failed to create payment intent';
STRIPE_ERRORS.CHECKOUT_SESSION_CREATION_FAILED =
  'Failed to create checkout session';
STRIPE_ERRORS.PAYMENT_INTENT_NOT_FOUND = 'Payment intent not found';
STRIPE_ERRORS.SESSION_NOT_FOUND = 'Checkout session not found';
STRIPE_ERRORS.GUEST_EMAIL_REQUIRED =
  'Guest email is required for unauthenticated payments';
STRIPE_ERRORS.INVALID_AMOUNT = 'Amount must be at least 50 cents';
```

## Customization Points

When integrating this module:

1. **Authentication**: Replace placeholder auth with your JWT implementation
2. **User Module**: Replace temporary User module with your implementation
3. **Webhook Logic**: Implement business-specific fulfillment logic
4. **Error Messages**: Customize error messages in response constants
5. **Validation**: Add additional validation rules as needed
6. **Metadata**: Use metadata for order/product tracking
