import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ComplimentaryGrant, NewStoreOption, SeatRequest } from '../src/api/types';
import { accessEnd } from '../src/pages/admin/Businesses';
import { BRANCHES, LINES, activityOptions, allocation, mount, serve, subscription, useActivityHarness } from './activity-fixtures';

useActivityHarness();

/*
 * A platform grant is told with its own dates (docs/73 §11.5). The page once said "granted until" beside the latest
 * billing period's START (2026-10-01 in the fixture); none of these cases may show that date as the grant's.
 */
const PERIOD_START = '2026-10-01T00:00:00.000Z';

function account(state: string, periodEnd: string | null, complimentary: ComplimentaryGrant | undefined, newStore?: NewStoreOption[], requests: SeatRequest[] = []) {
  const sub = subscription(BRANCHES, LINES);
  sub.entitlement = { ...sub.entitlement, state, periodEnd, isComplimentary: state === 'complimentary', ...(complimentary ? { complimentary } : {}) } as typeof sub.entitlement;
  sub.pricing.currentPeriod.periodStart = PERIOD_START;
  serve((url) => {
    if (url.endsWith('/platform/my-subscription')) return { body: sub };
    if (url.endsWith('/platform/my-subscription/activity-options')) return { body: activityOptions({}, newStore) };
    if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: requests };
    return undefined;
  });
  mount('/account');
}

const lead = async () => (await screen.findByRole('heading', { level: 1 })).closest('section')!;
const periodCard = async () => (await screen.findByRole('heading', { name: 'Current period' })).closest<HTMLElement>('.card')!;

describe('Account: the platform grant and its own dates', () => {
  it('an active grant says its own end, never the billing period’s start', async () => {
    account('complimentary', null, { status: 'active', until: '2026-12-31T00:00:00.000Z', paidUntil: null });
    const head = await lead();
    expect(within(head).getByText(/Access was granted by the platform until/).textContent).toMatch(/31/);
    expect(within(head).getByText(/Access was granted by the platform until/).textContent).not.toMatch(/1 Oct|Oct 1|01\/10|10\/1/);
    const card = await periodCard();
    expect(within(card).getByText(/Granted by the platform until/)).toBeTruthy();
    expect(within(card).queryByText('No period has started.')).toBeNull();
  });

  it('an ended grant says when it ended; access follows the paid period', async () => {
    account('expired', null, { status: 'ended', until: '2026-09-30T00:00:00.000Z', paidUntil: null });
    const card = await periodCard();
    expect(within(card).getByText(/The platform’s grant ended on/).textContent).toMatch(/30/);
    expect(within(await lead()).queryByText(/granted by the platform until/i)).toBeNull();
    // The lead names the grant's end too — never "the period ended on —" for a period that never was.
    const said = within(await lead()).getByText(/The platform’s grant ended on .*read-only/).textContent ?? '';
    expect(said).toMatch(/30/);
    expect(said).not.toContain('—');
  });

  it('expired with neither a grant nor a paid period: says no paid period has started, never "ended on —"', async () => {
    account('expired', null, { status: 'none', until: null, paidUntil: null });
    expect(within(await lead()).getByText('No paid period has started. The app is read-only until a payment is confirmed.')).toBeTruthy();
    expect(within(await lead()).queryByText(/ended on —/)).toBeNull();
  });

  it('a grant with no end recorded is shown without any date', async () => {
    account('complimentary', null, { status: 'indefinite', until: null, paidUntil: null });
    expect(within(await lead()).getByText('Access was granted by the platform. No end date is recorded.')).toBeTruthy();
    expect(within(await periodCard()).getByText('Granted by the platform. No end date is recorded.')).toBeTruthy();
  });

  it('a grant superseded by a paid period names both ends, each its own', async () => {
    account('active', '2026-11-15T00:00:00.000Z', { status: 'superseded', until: '2026-09-30T00:00:00.000Z', paidUntil: '2026-11-15T00:00:00.000Z' });
    const card = await periodCard();
    const line = within(card).getByText(/The platform’s grant ended on/).textContent ?? '';
    expect(line).toMatch(/30/);
    expect(line).toMatch(/15/);
    expect(within(card).getByText(/Ends on|Ends /)).toBeTruthy();
  });

  it('an API without the grant view still never shows the period start as a grant end, nor claims there is no end', async () => {
    account('complimentary', null, undefined);
    expect(within(await lead()).getByText('Access was granted by the platform.')).toBeTruthy();
    expect(within(await lead()).queryByText(/No end date is recorded/)).toBeNull();
  });
});

describe('Console list: when a business on a platform grant ends (docs/73 §11.5)', () => {
  const grant = (until: string): ComplimentaryGrant => ({ status: 'active', until, paidUntil: null });
  it('the grant’s end, not a paid end long past', () => {
    expect(accessEnd({ state: 'complimentary', periodEnd: '2026-09-01T00:00:00.000Z', complimentary: grant('2026-12-09T00:00:00.000Z') })).toBe('2026-12-09T00:00:00.000Z');
  });
  it('a grant over a paid month runs on into it: the later of the two', () => {
    expect(accessEnd({ state: 'complimentary', periodEnd: '2026-12-20T00:00:00.000Z', complimentary: grant('2026-11-09T00:00:00.000Z') })).toBe('2026-12-20T00:00:00.000Z');
  });
  it('any other business, and an API without the grant view: the paid end', () => {
    expect(accessEnd({ state: 'active', periodEnd: '2026-11-01T00:00:00.000Z', complimentary: { status: 'superseded', until: '2026-09-30T00:00:00.000Z', paidUntil: '2026-11-01T00:00:00.000Z' } })).toBe('2026-11-01T00:00:00.000Z');
    expect(accessEnd({ state: 'complimentary', periodEnd: '2026-11-01T00:00:00.000Z' })).toBe('2026-11-01T00:00:00.000Z');
  });
});

describe('Account: a new store that replaces one closed this month (D158)', () => {
  const replaced = (dueNow: number): NewStoreOption[] => [
    { activity: 'electronics', monthly: 500, dueNow, replaces: { branchId: 'b-old', name: 'Ancien Ksar', credit: 500 } },
    { activity: 'money_agent', monthly: 300, dueNow: 300, replaces: null },
    { activity: 'both', monthly: 700, dueNow: 200, replaces: { branchId: 'b-old', name: 'Ancien Ksar', credit: 500 } },
  ];

  it('says there is nothing more to pay when the replacement is the same or cheaper', async () => {
    account('active', '2026-11-01T00:00:00.000Z', undefined, replaced(0));
    const requests = (await screen.findByRole('heading', { name: 'Seat, store and activity requests' })).closest('section')!;
    expect(await within(requests).findByText(/replaces Ancien Ksar, closed during this paid month: no additional charge/)).toBeTruthy();
  });

  it('a sent replacement is listed as what it costs now and from the renewal — never as a monthly price', async () => {
    const store = (id: string, monthlyAmount: number, status: SeatRequest['status']) =>
      allocation({ id, kind: 'store', status, label: `Nouveau ${id.slice(-2)}`, store: null, branchId: null, branchName: null, activityFrom: null, activityTo: 'electronics', activityEffective: null, monthlyAmount, replaces: { branchId: 'b-old', name: 'Ancien Ksar', credit: 300 } });
    account('active', '2026-11-01T00:00:00.000Z', undefined, undefined, [store('0192f000-0000-7000-8000-0000000000b1', 200, 'pending_payment'), store('0192f000-0000-7000-8000-0000000000b2', 0, 'granted')]);
    const requests = (await screen.findByRole('heading', { name: 'Seat, store and activity requests' })).closest('section')!;
    expect(await within(requests).findByText(/200 MRU now, replacing Ancien Ksar; the full monthly price from the renewal/)).toBeTruthy();
    expect(within(requests).getByText(/Nothing more this month, replacing Ancien Ksar; the full monthly price from the renewal/)).toBeTruthy();
    // Neither row reads as a monthly price (the store form beside them still offers its activities per month).
    const table = within(requests).getByRole('table');
    expect(within(table).queryByText(/per month/)).toBeNull();
  });

  it('names the server’s difference for a dearer activity, and nothing for a store that replaces none', async () => {
    account('active', '2026-11-01T00:00:00.000Z', undefined, replaced(0));
    const requests = (await screen.findByRole('heading', { name: 'Seat, store and activity requests' })).closest('section')!;
    const user = userEvent.setup();
    const select = within(requests).getAllByRole('combobox').at(-1)!;
    await user.selectOptions(select, 'both');
    expect(await within(requests).findByText(/replaces Ancien Ksar, closed during this paid month: 200 MRU now/)).toBeTruthy();
    await user.selectOptions(select, 'money_agent');
    expect(within(requests).queryByText(/replaces Ancien Ksar/)).toBeNull();
  });
});
