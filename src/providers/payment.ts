/**
 * The payment boundary (docs/21, 2026-10-05; docs/68).
 *
 * No payment provider is operational: neither a mobile-money operator nor a
 * bank is integrated, and nothing on this site pretends otherwise: there is no pay
 * button, no destination number, no "paid" badge the server did not send.
 * Payments are confirmed by a platform administrator against a reference the
 * business gives, and every payment row carries `providerVerified: false`.
 *
 * This interface is the seam a real provider will fill. Until one is
 * configured, {@link paymentProvider} is the pending state, and the pages
 * render honest copy from it.
 */
export interface PaymentInstruction {
  /** The provider's name as the customer knows it. */
  provider: string;
  /** What the customer does — a destination, a code, a link. Never invented. */
  steps: string[];
}

export interface PaymentProvider {
  readonly name: string;
  /** False until a real provider is configured, tested and documented. */
  readonly available: boolean;
  /** Instructions for a given amount, or null while unavailable. */
  instructionsFor(amountMru: number, reference: string): PaymentInstruction | null;
}

export const noProviderConfigured: PaymentProvider = {
  name: 'none',
  available: false,
  instructionsFor: () => null,
};

/** What this deployment uses. Replaced by a configured provider when one exists. */
export const paymentProvider: PaymentProvider = noProviderConfigured;
