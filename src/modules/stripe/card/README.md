# Stripe Card Management Module

A reusable NestJS module for managing Stripe payment methods (cards) with full CRUD operations. This module can be easily copied and integrated into any NestJS project.

## Features

- ✅ Add new cards using Stripe Elements
- ✅ Retrieve all user cards with metadata
- ✅ Delete cards (with automatic default card reassignment)
- ✅ Set default card for payments
- ✅ Automatic Stripe customer creation
- ✅ Database storage of card metadata
- ✅ Comprehensive error handling
- ✅ Swagger/OpenAPI documentation
- ✅ Standardized API response format
- ✅ Reusable serializer utility
- ✅ Admin endpoint for all cards
- ✅ Payment method attachment validation
- ✅ Graceful error handling for Stripe API failures
- ✅ Type-safe response interfaces
- ✅ Consistent error messaging
- ✅ Duplicate card prevention using Stripe fingerprint

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

Copy the entire `stripe` module and required utilities to your project:

```
src/
  modules/
    stripe/
      stripe.module.ts
      stripe.service.ts
      card/
        card.module.ts
        card.controller.ts
        card.service.ts
        entities/
          card.entity.ts
        dto/
          add-card.dto.ts
          delete-card.dto.ts
          set-default-card.dto.ts
  common/
    constant/
      api-response/
        stripe.response.ts
        auth.response.ts
        general.response.ts
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

### 3. Configure Database

Update your `app.module.ts`:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeModule } from './modules/stripe/stripe.module';

@Module({
  imports: [
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
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Update Authentication

Replace the placeholder authentication in `card.controller.ts`:

```typescript
// Replace this:
const userId = 1; // Hardcoded for testing

// With your actual user extraction:
const userId = req.user.id; // or however you get user ID
```

### 5. Update User Service

Replace the temporary User module with your actual User service:

```typescript
// In card.module.ts, replace:
import { UserModule } from '../../../user/user.module';

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
} from 'src/utils';
import {
  STRIPE_SUCCESS,
  STRIPE_ERRORS,
} from 'src/common/constant/api-response';
```

## API Endpoints

### Add Card

```http
POST /stripe/cards
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890abcdef"
}
```

**Response:**

```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "stripePaymentMethodId": "pm_1234567890abcdef",
    "last4": "4242",
    "brand": "visa",
    "expiryMonth": 12,
    "expiryYear": 2025,
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "status": 201,
  "message": "Card added successfully"
}
```

### Get User Cards

```http
GET /stripe/cards
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "stripePaymentMethodId": "pm_1234567890abcdef",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "status": 200,
  "message": "Cards retrieved successfully"
}
```

### Get All Cards (Admin)

```http
GET /stripe/cards/all
Authorization: Bearer <your-admin-token>
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "stripePaymentMethodId": "pm_1234567890abcdef",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "status": 200,
  "message": "All cards retrieved successfully"
}
```

### Delete Card

```http
DELETE /stripe/cards/1
Authorization: Bearer <your-jwt-token>
```

**Response:**

```json
{
  "data": null,
  "status": 200,
  "message": "Card deleted successfully"
}
```

### Set Default Card

```http
PATCH /stripe/cards/1/default
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "cardId": 1
}
```

**Response:**

```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "stripePaymentMethodId": "pm_1234567890abcdef",
    "last4": "4242",
    "brand": "visa",
    "expiryMonth": 12,
    "expiryYear": 2025,
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "status": 200,
  "message": "Card set as default successfully"
}
```

## Frontend Integration

### 1. Create Payment Method with Stripe Elements

```javascript
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...');

function AddCardForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });

    if (error) {
      console.error('Error:', error);
    } else {
      // Send paymentMethod.id to your backend
      const response = await fetch('/stripe/cards', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
        }),
      });

      const result = await response.json();
      console.log('Card added:', result.data);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Add Card
      </button>
    </form>
  );
}

function App() {
  return (
    <Elements stripe={stripePromise}>
      <AddCardForm />
    </Elements>
  );
}
```

### 2. Display User Cards

```javascript
async function fetchUserCards() {
  const response = await fetch('/stripe/cards', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  return result.data; // Extract cards from the serialized response
}

function CardList() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    fetchUserCards().then(setCards);
  }, []);

  const deleteCard = async (cardId) => {
    await fetch(`/stripe/cards/${cardId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setCards(cards.filter((card) => card.id !== cardId));
  };

  const setDefaultCard = async (cardId) => {
    await fetch(`/stripe/cards/${cardId}/default`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cardId }),
    });

    // Refresh cards
    fetchUserCards().then(setCards);
  };

  return (
    <div>
      {cards.map((card) => (
        <div
          key={card.id}
          className={`card ${card.isDefault ? 'default' : ''}`}
        >
          <div>
            {card.brand.toUpperCase()} •••• {card.last4}
            {card.isDefault && <span> (Default)</span>}
          </div>
          <div>
            Expires {card.expiryMonth}/{card.expiryYear}
          </div>
          <div>
            <button onClick={() => setDefaultCard(card.id)}>
              Set as Default
            </button>
            <button onClick={() => deleteCard(card.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

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
STRIPE_SUCCESS.CARD_ADDED = 'Card added successfully';
STRIPE_SUCCESS.CARD_DELETED = 'Card deleted successfully';
STRIPE_SUCCESS.CARD_SET_DEFAULT = 'Card set as default successfully';
STRIPE_SUCCESS.CARDS_RETRIEVED = 'Cards retrieved successfully';

// Error messages
STRIPE_ERRORS.CARD_NOT_FOUND = 'Card not found';
STRIPE_ERRORS.PAYMENT_METHOD_NOT_FOUND = 'Payment method not found';
STRIPE_ERRORS.INVALID_PAYMENT_METHOD = 'Invalid payment method';
```

## Database Schema

The module creates a `cards` table with the following structure:

```sql
CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  stripe_payment_method_id VARCHAR UNIQUE NOT NULL,
  last4 VARCHAR NOT NULL,
  brand VARCHAR NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

The module includes comprehensive error handling for:

- Invalid payment methods
- Stripe API errors
- Database errors
- Authentication errors
- Card not found errors
- Duplicate card prevention

### Duplicate Card Prevention

The module automatically prevents duplicate cards by checking Stripe payment method fingerprints. When adding a new card:

1. **Fingerprint Check**: The system retrieves all payment methods for the user from Stripe
2. **Duplicate Detection**: Compares the new card's fingerprint with existing cards
3. **Database Validation**: Ensures the payment method isn't already stored in the database
4. **Error Response**: Returns a `400 Bad Request` with message "A card with the same fingerprint already exists"

This prevents users from adding the same physical card multiple times, even if they use different payment method IDs.

All errors follow standard HTTP status codes and return meaningful error messages.

## Security Considerations

1. **Environment Variables**: Never commit Stripe keys to version control
2. **Authentication**: Implement proper JWT or session-based authentication
3. **Validation**: All inputs are validated using class-validator
4. **Stripe Webhooks**: Consider implementing webhook handlers for real-time updates
5. **PCI Compliance**: Card data is handled by Stripe, not stored locally

## Testing

### Test Cards (Stripe Test Mode)

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000002500003155`

### Test Environment

```bash
# Set test environment
export NODE_ENV=test
export STRIPE_SECRET_KEY=sk_test_...

# Run tests
npm run test
```

## Customization Points

When integrating this module, you'll need to customize:

1. **User Entity**: Add `stripeCustomerId` field
2. **Authentication**: Replace placeholder auth guards
3. **Database**: Configure your PostgreSQL connection
4. **User Service**: Replace temporary user service
5. **Response Format**: The serializer utility provides a standard format, but you can customize the response constants
6. **Validation**: Add any additional validation rules
7. **Admin Access**: Implement proper admin authentication for the `/all` endpoint
8. **Error Messages**: Customize error messages in the response constants files

## Support

For issues or questions:

1. Check the TODO comments in the code
2. Review the Stripe documentation
3. Ensure all environment variables are set
4. Verify database connection and migrations

## License

This module is part of the reusable library project and follows the same license terms.
