import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { App } from '../src/app';
import type { Activity, ActivityOption, ActivityOptions, SeatRequest, SubscriptionBranch } from '../src/api/types';
import { I18nProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme/theme';

/*
 * The activity on the website (D154, docs/73 §6), rendered from mocked API
 * answers shaped exactly as the backend serialises them (money-agent-2b:
 * billing.service.ts publicPlan/estimate, platform.controller.ts
 * my-subscription, seat-allocation.service.ts view). Every figure asserted
 * here is one the mock sent, or the one explained difference.
 */

export const B1 = '0192f000-0000-7000-8000-000000000001';
export const B2 = '0192f000-0000-7000-8000-000000000002';
export const B3 = '0192f000-0000-7000-8000-000000000003';
export const BOTH = 'Both (electronics and money services)';

export const PLAN_V3 = {
  version: 3,
  branchMonthly: 500,
  agentMonthly: 300,
  bothMonthly: 700,
  includedSeatsPerStore: 1,
  extraSeatMonthly: 100,
  currency: 'MRU',
  effectiveFrom: '2026-10-08T00:00:00.000Z',
  upcoming: null,
};

export const line = (branchId: string | null, name: string, activity: Activity, activityFee: number, staffCount = 0, paidSeats = 0, seatFee = 0) => ({
  branchId,
  name,
  activity,
  activityFee,
  staffCount,
  includedSeats: 1,
  paidSeats,
  grantedSeats: 0,
  seatLimit: 1 + paidSeats,
  seatsAvailable: 0,
  overLimit: false,
  seatFee,
});

export function quoteOf(lines: ReturnType<typeof line>[], branchFee: number, staffFee: number) {
  return {
    branchMonthly: 500,
    agentMonthly: 300,
    bothMonthly: 700,
    extraStaffMonthly: 100,
    includedSeatsPerStore: 1,
    activeBranchCount: lines.length,
    activeStaffCount: lines.reduce((n, l) => n + l.staffCount, 0),
    includedStaffCount: lines.length,
    paidSeatCount: lines.reduce((n, l) => n + l.paidSeats, 0),
    grantedSeatCount: 0,
    chargeableStaffCount: lines.reduce((n, l) => n + l.paidSeats, 0),
    branchFee,
    staffFee,
    monthlyTotal: branchFee + staffFee,
    currency: 'MRU',
    lines,
  };
}

export function subscription(branches: SubscriptionBranch[], lines: ReturnType<typeof line>[]) {
  const quote = quoteOf(lines, 1500, 0);
  return {
    business: { name: 'Boutique Test', city: 'Nouakchott', createdAt: '2026-09-01T00:00:00.000Z', branches },
    owner: { name: 'Owner', email: 'owner@example.test', phone: null, emailVerified: true, phoneVerified: false },
    entitlement: {
      state: 'active',
      periodEnd: '2026-11-01T00:00:00.000Z',
      graceEnd: null,
      daysRemaining: 23,
      graceHoursRemaining: 0,
      subscribedBranchCount: 3,
      activeBranchCount: 3,
      includedSeats: 3,
      additionalSeats: 0,
      seatLimit: 3,
      seatsUsed: 0,
      overLimit: false,
      seatsByStore: lines.map((l) => ({ branchId: l.branchId, name: l.name, seatsUsed: 0, paidSeats: 0, grantedSeats: 0, includedSeats: 1, seatLimit: 1, seatsAvailable: 1, overLimit: false, activity: l.activity, activityNext: null })),
      canRead: true,
      canWrite: true,
      isComplimentary: false,
      status: 'active',
      calculatedAt: '2026-10-09T08:00:00.000Z',
    },
    pricing: {
      plan: { id: 'p3', planKey: 'standard', version: 3, branchMonthly: 500, agentMonthly: 300, bothMonthly: 700, includedStaffPerBranch: 1, extraStaffMonthly: 100, effectiveFrom: '2026-10-08T00:00:00.000Z', reason: 'v3' },
      upcomingPlan: null,
      quote,
      currentPeriod: { periodStart: '2026-10-01T00:00:00.000Z', assessedBranchFee: 1500, assessedStaffFee: 0, assessedTotal: 1500, adjustments: 0, available: true },
      nextRenewalEstimate: quote,
      currency: 'MRU',
    },
    events: [],
    payments: [],
  };
}

export const BRANCHES: SubscriptionBranch[] = [
  { id: B1, name: 'Agence Centre', type: 'store', activity: 'money_agent', activityNext: null, activityChangedAt: null },
  { id: B2, name: 'Boutique Ksar', type: 'store', activity: 'both', activityNext: null, activityChangedAt: null },
  { id: B3, name: 'Dépôt', type: 'warehouse', activity: 'electronics', activityNext: null, activityChangedAt: null },
];
export const LINES = [line(B1, 'Agence Centre', 'money_agent', 300), line(B2, 'Boutique Ksar', 'both', 700), line(B3, 'Dépôt', 'electronics', 500)];

/**
 * GET my-subscription/activity-options for BRANCHES: the server's answer for each change, and a new store's charge.
 * A store's options can be replaced to model another state (no paid month, a change already scheduled, a new plan).
 */
export function activityOptions(stores: Partial<Record<string, ActivityOption[]>> = {}, newStore?: ActivityOptions['newStore']): ActivityOptions {
  return {
    running: true,
    stores: [
      {
        branchId: B1,
        name: 'Agence Centre',
        activity: 'money_agent',
        activityNext: null,
        options: stores[B1] ?? [
          { activity: 'electronics', outcome: 'now', dueNow: 200, monthlyAfter: 500 },
          { activity: 'both', outcome: 'now', dueNow: 400, monthlyAfter: 700 },
        ],
      },
      {
        branchId: B2,
        name: 'Boutique Ksar',
        activity: 'both',
        activityNext: null,
        options: stores[B2] ?? [
          { activity: 'electronics', outcome: 'renewal', dueNow: 0, monthlyAfter: 500 },
          { activity: 'money_agent', outcome: 'renewal', dueNow: 0, monthlyAfter: 300 },
        ],
      },
    ],
    newStore: newStore ?? [
      { activity: 'electronics', monthly: 500 },
      { activity: 'money_agent', monthly: 300 },
      { activity: 'both', monthly: 700 },
    ],
  };
}

export function allocation(over: Partial<SeatRequest>): SeatRequest {
  return {
    id: '0192f000-0000-7000-8000-0000000000a1',
    kind: 'activity',
    status: 'pending_payment',
    store: { id: B1, name: 'Agence Centre' },
    person: null,
    label: null,
    branchId: B1,
    branchName: 'Agence Centre',
    activityFrom: 'money_agent',
    activityTo: 'both',
    activityEffective: 'now',
    monthlyAmount: 400,
    currency: 'MRU',
    requestedBy: 'owner@example.test',
    requestedAt: '2026-10-09T09:00:00.000Z',
    confirmedBy: null,
    confirmedAt: null,
    closedAt: null,
    closedBy: null,
    reason: null,
    payment: null,
    version: 1,
    providerVerified: false,
    ...over,
  };
}

export type Handler = (url: string, body: unknown) => { status?: number; body: unknown } | undefined;

/** A fetch that answers by route and remembers every body it was sent. */
export function serve(handler: Handler) {
  const sent: { url: string; method: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    sent.push({ url, method: init?.method ?? 'GET', body });
    const answer = handler(url, body);
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
    if (answer) return json(answer.body, answer.status ?? 200);
    if (url.endsWith('/platform/admin/me')) return json({ message: 'Unauthorized' }, 401);
    return json({ message: `unexpected ${url}` }, 500);
  });
  vi.stubGlobal('fetch', fetchMock);
  return sent;
}

export function mount(path: string) {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  );
}

/** Every activity spec starts in English with clean storage and ends with the fetch restored. */
export function useActivityHarness() {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('erp.web.language', 'en');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
}
