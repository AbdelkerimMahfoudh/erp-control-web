import type { Activity, ActivityOption, ActivityOptions, PortalStatus, SeatActivation, SeatRequest, SubscriptionBranch, TrialOffer, TrialSetup, TrialStatus, TrialView } from '../src/api/types';

/*
 * The API answers the activity specs mock (D154, docs/73 §6), shaped as the backend serialises them — data only,
 * no React or test runner, so the browser checks (e2e/) answer the same fixtures as the component tests.
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
    effectiveAt: null,
    activation: null,
    version: 1,
    providerVerified: false,
    ...over,
  };
}

/*
 * The free trial (2026-10-13), as GET platform/my-subscription/trial answers it: UTC instants and the business's zone.
 * The zone is Africa/Lagos (GMT+1) on purpose — neither the server's UTC nor the test runner's zone — so a page
 * that formatted a trial date in either would show another hour: 09:30 UTC is 10:30 there. Lagos has no daylight
 * saving and settled rules, so every Node's time-zone data agrees on that hour; Africa/Casablanca, used before, does
 * not (newer data puts it on GMT in October 2026, and CI failed on every run from 4b61f79 to 8efa902).
 */
export const TRIAL_ZONE = 'Africa/Lagos';
export const TRIAL_START = '2026-10-13T09:30:00.000Z';
export const TRIAL_END = '2026-10-20T09:30:00.000Z';

export function trialOffer(over: Partial<TrialOffer> = {}): TrialOffer {
  return {
    available: true,
    reason: null,
    termsVersion: '2026-10-18',
    durationHours: 168,
    wouldStartAt: TRIAL_START,
    wouldEndAt: TRIAL_END,
    timeZone: TRIAL_ZONE,
    requiredContacts: ['phone'],
    missingContacts: [],
    ...over,
  };
}

/**
 * By default the portal instructions went out once, automatically, by WhatsApp to the verified number — the history
 * says so too.
 */
export function trialSetup(over: Partial<TrialSetup> = {}): TrialSetup {
  return {
    delivery: 'sent',
    channel: 'whatsapp',
    destination: '+222••••1234',
    fallbackReason: null,
    failureReason: null,
    lastAttemptAt: '2026-10-13T08:00:00.000Z',
    lastSentAt: '2026-10-13T08:00:00.000Z',
    destinations: [{ channel: 'whatsapp', masked: '+222••••1234' }],
    canResendNow: true,
    resendBlockedBy: null,
    resendAvailableAt: null,
    history: [{ at: '2026-10-13T08:00:00.000Z', trigger: 'automatic', delivery: 'sent', channel: 'whatsapp', fallbackReason: null, failureReason: null }],
    ...over,
  };
}

/** The portal session as the API answers its session route: who is signed in, and the session's CSRF token. */
export const PORTAL_SESSION = { owner: { name: 'Aicha' }, business: { name: 'Boutique Test' }, csrfToken: 'csrf-for-tests' };

/**
 * GET platform/my-subscription/status for a paid business: the app works, a paid period runs, its end would open a
 * grace — every part as the server decides it.
 */
export function portalStatus(over: Partial<PortalStatus> = {}): PortalStatus {
  return {
    access: 'operational',
    state: 'active',
    period: { start: '2026-10-01T09:30:00.000Z', end: '2026-11-01T09:30:00.000Z' },
    grace: {
      status: 'none',
      startedAt: null,
      endsAt: null,
      hoursRemaining: 0,
      availableAtPeriodEnd: true,
      allowance: 3,
      windowMonths: 12,
      durationHours: 72,
      usesInWindow: 1,
      usesRemaining: 2,
      nextUseRestoredAt: '2027-03-01T09:30:00.000Z',
    },
    notices: { next: { kind: 'paid_reminder', threshold: 'h72', dueAt: '2026-10-29T09:30:00.000Z' }, last: null },
    actions: { claimTrial: false, resendInstructions: false, paymentInstructions: false },
    timeZone: TRIAL_ZONE,
    calculatedAt: '2026-10-18T09:00:00.000Z',
    ...over,
  };
}

/** A recorded trial: claimed at TRIAL_START, ending exactly 168 hours later — both the server's instants, as sent. */
export function trialView(status: TrialView['status'], over: Partial<TrialView> = {}): TrialView {
  const recorded = status === 'available' ? null : { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: TRIAL_END };
  return { status, durationHours: 168, durationDays: 7, claimedAt: null, startedAt: null, endsAt: null, timeZone: TRIAL_ZONE, ...recorded, ...over };
}

/** The Owner's trial read: by default, a business that may claim now, its instructions sent to its verified email. */
export function trialStatus(over: Partial<TrialStatus> = {}): TrialStatus {
  return { state: 'trial_available', trial: trialView('available'), offer: trialOffer(), setup: trialSetup(), calculatedAt: TRIAL_START, ...over };
}

/** A business that never had a trial and never can (paid, granted, or created from the console): no card. */
export const NO_TRIAL: TrialStatus = { state: 'active', trial: null, offer: null, setup: null, calculatedAt: TRIAL_START };

/**
 * A store or seat paid for during the free trial (D176, 2026-10-15), as the server lists it once the platform confirmed
 * its payment: scheduled — paid, in force nowhere — its start the end the trial's claim recorded, in the business's
 * zone, waiting for that end (paid access approved for it) unless the activation says it waits for paid access. Shaped
 * as `SeatAllocationService.view` serialises a row: a store has no branch yet, only its label and activity.
 */
export function scheduledRequest(kind: 'store' | 'seat', over: Partial<SeatRequest> = {}, activation: Partial<SeatActivation> = {}): SeatRequest {
  const store = kind === 'store';
  return allocation({
    id: store ? '0192f000-0000-7000-8000-0000000000d1' : '0192f000-0000-7000-8000-0000000000d2',
    kind,
    status: 'scheduled',
    store: store ? null : { id: B1, name: 'Agence Centre' },
    person: null,
    label: store ? 'Boutique Nord' : null,
    branchId: store ? null : B1,
    branchName: store ? null : 'Agence Centre',
    activityFrom: null,
    activityTo: store ? 'electronics' : null,
    activityEffective: null,
    monthlyAmount: store ? 500 : 100,
    requestedAt: '2026-10-14T09:00:00.000Z',
    confirmedBy: 'admin@example.test',
    confirmedAt: '2026-10-15T08:00:00.000Z',
    payment: { id: store ? '0192f000-0000-7000-8000-0000000000e1' : '0192f000-0000-7000-8000-0000000000e2', amount: store ? '500' : '100', reference: store ? 'BK-1' : 'BK-2', paidAt: '2026-10-15T00:00:00.000Z', channel: 'bank_transfer' },
    effectiveAt: TRIAL_END,
    activation: { startsAt: TRIAL_END, timeZone: TRIAL_ZONE, waitsFor: 'trial_end', ...activation },
    version: 2,
    ...over,
  });
}

/** A zone's name as this runtime's Intl says it — what a page is asked to show beside a trial date, never to invent. */
export const zoneName = (zone: string, locale = 'en-GB', iso = TRIAL_END) =>
  new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'long' }).formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName')!.value;
