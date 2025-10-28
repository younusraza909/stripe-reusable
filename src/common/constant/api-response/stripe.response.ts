export enum STRIPE_SUCCESS {
  CARD_ADDED = 'Card added successfully',
  CARD_DELETED = 'Card deleted successfully',
  CARD_SET_DEFAULT = 'Card set as default successfully',
  CARDS_RETRIEVED = 'Cards retrieved successfully',
  ALL_CARDS_RETRIEVED = 'All cards retrieved successfully',
  PAYMENT_METHOD_ATTACHED = 'Payment method attached successfully',
  PAYMENT_METHOD_DETACHED = 'Payment method detached successfully',
  CUSTOMER_UPDATED = 'Customer updated successfully',
}

export enum STRIPE_ERRORS {
  CARD_NOT_FOUND = 'Card not found',
  PAYMENT_METHOD_NOT_FOUND = 'Payment method not found',
  CUSTOMER_NOT_FOUND = 'Customer not found',
  PAYMENT_METHOD_ATTACHMENT_FAILED = 'Failed to attach payment method',
  PAYMENT_METHOD_DETACHMENT_FAILED = 'Failed to detach payment method',
  CUSTOMER_UPDATE_FAILED = 'Failed to update customer',
  STRIPE_API_ERROR = 'Stripe API error occurred',
  INVALID_PAYMENT_METHOD = 'Invalid payment method',
  PAYMENT_METHOD_ALREADY_ATTACHED = 'Payment method is already attached to this customer',
  PAYMENT_METHOD_NOT_ATTACHED = 'Payment method is not attached to any customer',
  CUSTOMER_ID_REQUIRED = 'Customer ID is required',
  PAYMENT_METHOD_ID_REQUIRED = 'Payment method ID is required',
  DUPLICATE_CARD = 'A card with the same fingerprint already exists',
  WEBHOOK_SIGNATURE_VERIFICATION_FAILED = 'Webhook signature verification failed',
  WEBHOOK_PROCESSING_FAILED = 'Webhook processing failed',
}
