import type { Activity, ActivityOption, ActivityPrices, SeatRequest } from '../api/types';

/**
 * A branch's activity on the website (D154, docs/73 §3, §6).
 *
 * The server prices every activity and every change, and says before a change
 * is asked what it would do (GET my-subscription/activity-options); this file
 * only READS the figures it sent and names the change. Nothing here computes a
 * charge.
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
export function activityPrice(prices: Partial<ActivityPrices> | null | undefined, activity: Activity): number | null {
  if (!prices) return null;
  const value = activity === 'money_agent' ? prices.agentMonthly : activity === 'both' ? prices.bothMonthly : prices.branchMonthly;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The monthly price each offered activity would have once the next paid period opens, as the server answered — for the cards. */
export function pricesAfter(options: readonly ActivityOption[]): Partial<ActivityPrices> {
  const after = (a: Activity) => options.find((o) => o.activity === a)?.monthlyAfter ?? undefined;
  return { branchMonthly: after('electronics'), agentMonthly: after('money_agent'), bothMonthly: after('both') };
}

/** A change waiting for the next renewal: granted, not yet applied. The Owner may still withdraw it. */
export function isScheduledActivityChange(r: Pick<SeatRequest, 'kind' | 'status' | 'confirmedAt'>): boolean {
  return r.kind === 'activity' && r.status === 'granted' && r.confirmedAt === null;
}

/** What the Owner may still take back: anything unpaid, and a change not yet applied. */
export function canWithdraw(r: Pick<SeatRequest, 'kind' | 'status' | 'confirmedAt'>): boolean {
  return r.status === 'pending_payment' || isScheduledActivityChange(r);
}
