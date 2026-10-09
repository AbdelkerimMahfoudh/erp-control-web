import { describe, expect, it } from 'vitest';
import type { SeatRequest } from '../src/api/types';
import { activityPrice, canWithdraw, isScheduledActivityChange, pricesAfter } from '../src/lib/activity';

/** The pure activity rules of the website (D154, docs/73 §6): read a price the server sent, know a scheduled change. */

/** An activity request row, as `seat-allocation.service.ts` serialises the fields these rules read. */
function row(over: Partial<SeatRequest>): Pick<SeatRequest, 'kind' | 'status' | 'confirmedAt'> {
  return { kind: 'activity', status: 'pending_payment', confirmedAt: null, ...over };
}

describe('the activity rules the site uses', () => {
  it('reads each activity price from the plan, and nothing when the server did not send it', () => {
    const plan = { branchMonthly: 500, agentMonthly: 300, bothMonthly: 700 };
    expect(activityPrice(plan, 'electronics')).toBe(500);
    expect(activityPrice(plan, 'money_agent')).toBe(300);
    expect(activityPrice(plan, 'both')).toBe(700);
    // An API older than the activity: no agent or both price, so no figure.
    expect(activityPrice({ branchMonthly: 500 }, 'money_agent')).toBeNull();
    expect(activityPrice(null, 'electronics')).toBeNull();
  });

  it('reads the card prices from the server’s options, and leaves out what it did not price', () => {
    expect(
      pricesAfter([
        { activity: 'electronics', outcome: 'renewal', dueNow: 0, monthlyAfter: 550 },
        { activity: 'both', outcome: 'now', dueNow: 400, monthlyAfter: 770 },
      ]),
    ).toEqual({ branchMonthly: 550, agentMonthly: undefined, bothMonthly: 770 });
    // A refused option has no price.
    expect(activityPrice(pricesAfter([{ activity: 'money_agent', outcome: 'refused', code: 'activity_request_pending', blockedBy: 'both', dueNow: 0, monthlyAfter: null }]), 'money_agent')).toBeNull();
  });

  it('knows a scheduled change from an applied one, and what the Owner may withdraw', () => {
    const scheduled = row({ status: 'granted', activityEffective: 'renewal', confirmedAt: null, monthlyAmount: 0 });
    const applied = row({ status: 'granted', activityEffective: 'renewal', confirmedAt: '2026-11-01T00:00:00.000Z', reason: 'Applied at the renewal.' });
    expect(isScheduledActivityChange(scheduled)).toBe(true);
    expect(isScheduledActivityChange(applied)).toBe(false);
    expect(canWithdraw(scheduled)).toBe(true);
    expect(canWithdraw(applied)).toBe(false);
    expect(canWithdraw(row({}))).toBe(true);
    expect(canWithdraw(row({ status: 'paid' }))).toBe(false);
    expect(canWithdraw({ kind: 'seat', status: 'granted', confirmedAt: null })).toBe(false);
  });
});
