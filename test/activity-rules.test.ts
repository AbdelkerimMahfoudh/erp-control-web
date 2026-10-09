import { describe, expect, it } from 'vitest';
import type { SeatRequest } from '../src/api/types';
import { activityPrice, canWithdraw, explainActivityChange, isScheduledActivityChange } from '../src/lib/activity';

/** The pure activity rules of the website (D154, docs/73 §6): read a price, explain a change, know a scheduled one. */

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

  it('explains a higher price as the difference now, and anything else as the renewal (D154 b)', () => {
    expect(explainActivityChange(300, 700)).toEqual({ kind: 'upgrade', differenceNow: 400 });
    expect(explainActivityChange(500, 700)).toEqual({ kind: 'upgrade', differenceNow: 200 });
    expect(explainActivityChange(300, 500)).toEqual({ kind: 'upgrade', differenceNow: 200 });
    expect(explainActivityChange(700, 300)).toEqual({ kind: 'downgrade', differenceNow: 0 });
    expect(explainActivityChange(500, 300)).toEqual({ kind: 'downgrade', differenceNow: 0 });
    // The server schedules an equal price like a lower one.
    expect(explainActivityChange(500, 500)).toEqual({ kind: 'downgrade', differenceNow: 0 });
    expect(explainActivityChange(null, 700)).toBeNull();
    expect(explainActivityChange(300, null)).toBeNull();
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
