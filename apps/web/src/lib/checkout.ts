export type CheckoutIntent = {
  userId: string;
  productKey: string;
  characterId?: string;
};

export type CheckoutIntentResult = {
  provider: 'disabled' | 'stripe';
  status: 'configuration_required' | 'created';
  checkoutUrl: string | null;
  productKey: string;
  message: string;
};

export async function createCheckoutIntent(input: CheckoutIntent): Promise<CheckoutIntentResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      provider: 'disabled',
      status: 'configuration_required',
      checkoutUrl: null,
      productKey: input.productKey,
      message: 'Checkout provider is not configured. The MVP entitlement catalog is ready, but live payments are disabled.',
    };
  }

  return {
    provider: 'stripe',
    status: 'configuration_required',
    checkoutUrl: null,
    productKey: input.productKey,
    message: 'Stripe adapter placeholder reached. Implement hosted checkout session creation before enabling live payments.',
  };
}
