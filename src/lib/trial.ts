import { ApiError } from '../api/client';
import type { TrialRefusalCode } from '../api/types';
import { TRIAL_LANDING } from '../site/routes';

/**
 * The free trial's few rules on the website's side (2026-10-13). The server decides everything about a trial — its
 * state, its start, its end, whether it may be claimed — and this file only reads what a page needs to say it.
 */

/**
 * The terms this site's text describes. The claim sends this version — the one the Owner was shown — and the button
 * is offered only while the server's current version is the same: when the server moves to new terms, the page says
 * its text is out of date rather than let the Owner confirm terms they were never shown.
 */
export const TRIAL_TERMS_SHOWN = '2026-10-13';

export function isTrialLanding(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === TRIAL_LANDING;
}

/**
 * The setup link's token as the address carries it: `#t=` from the email (a fragment never reaches any server) or
 * `?t=` from the WhatsApp button (the provider appends it as a query). `null` when the address carries none; an empty
 * or malformed value comes back as it is, for the page to call the link invalid without sending it anywhere.
 */
export function setupTokenIn(hash: string, search: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('t') ?? new URLSearchParams(search).get('t');
}

/** The server sends 256 random bits in base64url (43 characters) and accepts 16 to 200: nothing else is a token. */
export function isTokenShaped(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,200}$/.test(token);
}

const REFUSALS: ReadonlySet<string> = new Set<TrialRefusalCode>([
  'owner_only',
  'idempotency_conflict',
  'trial_already_claimed',
  'business_closed',
  'business_suspended',
  'business_refused',
  'trial_not_available',
  'terms_changed',
  'contact_unverified',
  'link_invalid',
  'link_expired',
  'link_used',
  'link_revoked',
  'link_other_account',
]);

/** The claim refusal a server answer names — a decision, said in words — or null for a failure worth retrying. */
export function refusalOf(e: unknown): TrialRefusalCode | null {
  return e instanceof ApiError && e.code !== null && REFUSALS.has(e.code) ? (e.code as TrialRefusalCode) : null;
}

/** A detail the server attached to a refusal (`missingContacts`, `resendAvailableAt`), or undefined. */
export function detailOf<T>(e: unknown, key: string): T | undefined {
  if (!(e instanceof ApiError) || !e.body || typeof e.body !== 'object') return undefined;
  return (e.body as Record<string, unknown>)[key] as T | undefined;
}

/**
 * Whole seconds from `now` until a server instant, by this browser's clock — the one comparison the trial pages make
 * with it, and only to count down the wait before the setup instructions may be sent again (the server refuses an
 * early send anyway, and says when). A trial's own start and end are never computed here: they are the server's.
 */
export function secondsUntil(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? 0 : Math.max(0, Math.ceil((at - now) / 1000));
}
