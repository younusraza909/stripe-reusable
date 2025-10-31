# Stripe Invoice Management Module

A reusable NestJS module for managing Stripe invoices with creation, retrieval, and payment operations. This module can be easily copied and integrated into any NestJS project.

## Features

- ✅ Create invoices with invoice items (amount, currency, description)
- ✅ Retrieve invoice by ID with expanded line items
- ✅ Pay invoices (automatic card payment or manual offline payment)
- ✅ Automatic invoice finalization after creation
- ✅ Metadata support for invoices and invoice items
- ✅ Comprehensive error handling
- ✅ Standardized API response format
- ✅ Reusable serializer utility
- ✅ Type-safe response interfaces
- ✅ Consistent error messaging
- ✅ Invoice status validation

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

# Optional
NODE_ENV=development
```

## Integration Steps

### 1. Copy Module Files

Copy the invoice module and required utilities to your project:

```
src/
  modules/
    stripe/
      stripe.module.ts
      stripe.service.ts
      invoice/
        invoice.module.ts
        invoice.controller.ts
        invoice.service.ts
        dto/
          create-invoice.dto.ts
          pay-invoice.dto.ts
  common/
    constant/
      api-response/
        stripe.response.ts
        index.ts
  utils/
    serializer.ts
    index.ts
```

### 2. Update User Entity

Ensure your User entity has a `stripeCustomerId` field:

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column({ nullable: true })
  stripeCustomerId?: string; // Add this field

  // ... other fields
}
```

### 3. Configure App Module

Update your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeModule } from './modules/stripe/stripe.module';
import { InvoiceModule } from './modules/stripe/invoice/invoice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StripeModule,
    InvoiceModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Update Authentication

Replace the placeholder authentication in `invoice.controller.ts`:

```typescript
// Replace this pattern:
// TODO: Replace with your actual user ID extraction from JWT token

// With your actual user extraction:
const userId = req.user.id; // or however you get user ID
```

### 5. Update User Service

Replace the temporary User module with your actual User service:

```typescript
// In invoice.module.ts, replace:
import { UserModule } from 'src/modules/user/user.module';

// With your actual user module:
import { YourUserModule } from '../your-user/your-user.module';
```

### 6. Import Serializer Utility

Make sure to import the serializer utility in your files:

```typescript
import {
  SerializeHttpResponse,
  SerializeHttpError,
  SuccessResponse,
  Serialized,
} from 'src/utils';
import {
  STRIPE_SUCCESS,
  STRIPE_ERRORS,
} from 'src/common/constant/api-response';
```

## API Endpoints

### Create Invoice

```http
POST /stripe/invoices
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "customerId": 1,
  "amount": 2000,
  "currency": "usd",
  "description": "Service fee",
  "metadata": {
    "orderId": "12345",
    "source": "website"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "in_1234567890abcdef",
    "object": "invoice",
    "status": "open",
    "customer": "cus_1234567890abcdef",
    "amount_due": 2000,
    "currency": "usd",
    "lines": {
      "object": "list",
      "data": [
        {
          "id": "il_1234567890abcdef",
          "amount": 2000,
          "currency": "usd",
          "description": "Service fee",
          "metadata": {
            "orderId": "12345",
            "source": "website"
          }
        }
      ],
      "total_count": 1
    },
    "subtotal": 2000,
    "total": 2000,
    "metadata": {
      "orderId": "12345",
      "source": "website"
    },
    "created": 1234567890
  },
  "status": 201,
  "message": "Invoice created successfully"
}
```

### Get Invoice by ID

```http
GET /stripe/invoices/in_1234567890abcdef
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "data": {
    "id": "in_1234567890abcdef",
    "object": "invoice",
    "status": "open",
    "customer": "cus_1234567890abcdef",
    "amount_due": 2000,
    "currency": "usd",
    "lines": {
      "object": "list",
      "data": [
        {
          "id": "il_1234567890abcdef",
          "amount": 2000,
          "currency": "usd",
          "description": "Service fee"
        }
      ],
      "total_count": 1
    },
    "subtotal": 2000,
    "total": 2000,
    "created": 1234567890
  },
  "status": 200,
  "message": "Invoice retrieved successfully"
}
```

### Pay Invoice

```http
POST /stripe/invoices/pay/in_1234567890abcdef
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "payWithCard": true
}
```

**Request Body Options:**

- `payWithCard: true` - Attempts to charge the customer's saved payment method automatically
- `payWithCard: false` - Marks the invoice as paid manually (offline payment)

**Response (with card payment):**

```json
{
  "data": {
    "id": "in_1234567890abcdef",
    "object": "invoice",
    "status": "paid",
    "customer": "cus_1234567890abcdef",
    "amount_due": 0,
    "amount_paid": 2000,
    "currency": "usd",
    "paid_at": 1234567890
  },
  "status": 200,
  "message": "Invoice paid successfully"
}
```

**Response (manual/offline payment):**

```json
{
  "data": {
    "id": "in_1234567890abcdef",
    "object": "invoice",
    "status": "paid",
    "customer": "cus_1234567890abcdef",
    "amount_due": 0,
    "amount_paid": 2000
  },
  "status": 200,
  "message": "Invoice marked as paid manually (offline payment)."
}
```

## Invoice Creation Flow

When creating an invoice, the module performs these steps:

1. **Creates an empty invoice** in draft status
2. **Creates an invoice item** and attaches it to the invoice with:
   - Amount (in cents)
   - Currency
   - Description
   - Optional metadata
3. **Finalizes the invoice** automatically, changing status from "draft" to "open"
4. **Retrieves the finalized invoice** with expanded lines to return complete invoice details

## Invoice Status Flow

Stripe invoices follow this status flow:

- **draft** - Invoice is being prepared (invoice items can be added)
- **open** - Invoice is finalized and ready for payment
- **paid** - Invoice has been paid successfully
- **void** - Invoice has been voided/cancelled
- **uncollectible** - Payment attempts have failed

## Response Format

All API responses follow a standardized format using the serializer utility:

### Success Response

```json
{
  "data": <actual_data>,
  "status": <http_status_code>,
  "message": "<success_message>"
}
```

### Error Response

```json
{
  "data": null,
  "status": <error_status_code>,
  "message": "<error_message>"
}
```

### Response Constants

The module uses predefined response constants for consistency:

```typescript
// Success messages
STRIPE_SUCCESS.INVOICE_CREATED = 'Invoice created successfully';
STRIPE_SUCCESS.INVOICE_RETRIEVED = 'Invoice retrieved successfully';
STRIPE_SUCCESS.INVOICE_PAID = 'Invoice paid successfully';

// Error messages
STRIPE_ERRORS.INVOICE_NOT_FOUND = 'Invoice not found';
STRIPE_ERRORS.INVOICE_CREATION_FAILED = 'Failed to create invoice';
STRIPE_ERRORS.INVOICE_PAYMENT_FAILED = 'Failed to pay invoice';
STRIPE_ERRORS.INVOICE_ALREADY_PAID = 'Invoice is already paid';
STRIPE_ERRORS.INVOICE_NOT_FINALIZED = 'Invoice is not in open status';
STRIPE_ERRORS.INVOICE_FINALIZATION_FAILED = 'Failed to finalize invoice';
STRIPE_ERRORS.CUSTOMER_NOT_FOUND = 'Customer not found';
```

## Customization Points

When integrating this module, you'll need to customize:

1. **User Entity**: Add `stripeCustomerId` field
2. **Authentication**: Replace placeholder auth guards
3. **User Service**: Replace temporary user service with your actual implementation
4. **Response Format**: The serializer utility provides a standard format, but you can customize the response constants
5. **Validation**: Add any additional validation rules
6. **Authorization**: Implement proper authorization checks to ensure users can only access their own invoices
7. **Error Messages**: Customize error messages in the response constants files
