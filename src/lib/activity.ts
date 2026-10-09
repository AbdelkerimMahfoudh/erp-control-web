import type { Activity, ActivityPrices, SeatRequest } from '../api/types';

/**
 * A branch's activity on the website (D154, docs/73 §3, §6).
 *
 * The server prices every activity and every change; this file only READS the
 * prices it sent and names the change. The one subtraction below explains an
 * upgrade before it is asked for — the amount actually due is the one the
 * server records on the request, and the page shows that one once it exists.
 */

/** Every activity, in the order the site offers them. */
export const ACTIVITIES: readonly Activity[] = ['electronics', 'money_agent', 'both'];

export function isActivity(value: unknown): value is Activity {
  return typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value);
}

/**
 * The plan's monthly price for one activity — a field read, never a sum.
 * Null when the server did not send that price (an API older than the
 * activity), so the page shows nothing rather than a wrong figure.
 */
export function activityPrice(prices: ActivityPrices | null | undefined, activity: Activity): number | null {
  if (!prices) return null;
  const value = activity === 'money_agent' ? prices.agentMonthly : activity === 'both' ? prices.bothMonthly : prices.branchMonthly;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export type ActivityChangeKind = 'upgrade' | 'downgrade';

export interface ActivityChangePreview {
  kind: ActivityChangeKind;
  /** The difference an upgrade costs for the month it is confirmed in, as the price list explains it. Zero otherwise. */
  differenceNow: number;
}

/**
 * How the price list explains a change to ANOTHER activity, before the request
 * exists: a higher price is an upgrade (the difference for this month, D154 b);
 * anything else a downgrade (from the next renewal, nothing due now) — the
 * server's own rule, which schedules an equal price like a lower one. Null when
 * either price is unknown.
 *
 * An explanation only. Whether the difference is really due now depends on
 * whether a paid month is running — the server decides that, so the page
 * never infers "upgrade, so pay now" from this; it renders the request the
 * server answers with.
 */
export function explainActivityChange(currentFee: number | null, targetFee: number | null): ActivityChangePreview | null {
  if (currentFee === null || targetFee === null) return null;
  if (targetFee <= currentFee) return { kind: 'downgrade', differenceNow: 0 };
  return { kind: 'upgrade', differenceNow: targetFee - currentFee }; // explanation-only: the server records the amount due (docs/73 §6)
}

/** A change waiting for the next renewal: granted, not yet applied. The Owner may still withdraw it. */
export function isScheduledActivityChange(r: Pick<SeatRequest, 'kind' | 'status' | 'confirmedAt'>): boolean {
  return r.kind === 'activity' && r.status === 'granted' && r.confirmedAt === null;
}

/** What the Owner may still take back: anything unpaid, and a change not yet applied. */
export function canWithdraw(r: Pick<SeatRequest, 'kind' | 'status' | 'confirmedAt'>): boolean {
  return r.status === 'pending_payment' || isScheduledActivityChange(r);
}
