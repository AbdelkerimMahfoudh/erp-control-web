import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { BusinessDetail, EntitlementState } from '../src/api/types';
import { en } from '../src/i18n/en';
import { BRANCHES, LINES, mount, serve, subscription, useActivityHarness } from './activity-fixtures';
import { TRIAL_END, TRIAL_START, TRIAL_ZONE, trialView, zoneName } from './fixtures-data';

useActivityHarness();

/*
 * The free trial in the console (2026-10-13): each business's eligibility and claim as recorded, in the business's
 * zone (Africa/Casablanca, GMT+1, so 09:30 UTC is 10:30 there), the three trial states in the overview and the list,
 * and no decision that could create, extend or shorten a trial.
 */
const CASABLANCA = zoneName(TRIAL_ZONE);

describe('the console: a business’s trial, recorded', () => {
  const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
  const ID = '0192f000-0000-7000-8000-0000000000b1';

  function business(trial: BusinessDetail['trial'], state: EntitlementState = 'trial_active', events: BusinessDetail['events'] = []) {
    const sub = subscription(BRANCHES, LINES);
    const detail: BusinessDetail = {
      id: ID,
      name: 'Boutique Test',
      publicStoreId: 'ST-7Q4K',
      city: 'Nouakchott',
      createdAt: '2026-10-12T10:00:00.000Z',
      branches: [],
      people: [],
      entitlement: { ...(sub.entitlement as BusinessDetail['entitlement'] & object), state, status: 'pending_activation', trial: state === 'trial_active' ? trialView('active') : null },
      pricing: null,
      version: 4,
      events,
      payments: [],
      trial,
    };
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith(`/platform/businesses/${ID}`)) return { body: detail };
      if (url.endsWith(`/platform/businesses/${ID}/seat-requests`)) return { body: [] };
      return undefined;
    });
    mount(`/admin/businesses/${ID}`);
  }

  const trialCard = async () => (await screen.findByRole('heading', { name: 'Free trial', level: 2 })).closest('section')!;

  it('shows the eligibility and the claim with their exact instants, and that no decision creates or extends a trial', async () => {
    business({
      eligibility: { registrationMethod: 'both', createdAt: '2026-10-12T10:00:00.000Z', closedAt: null, closedReason: null },
      claim: { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: TRIAL_END, expiryRecordedAt: null },
      timeZone: TRIAL_ZONE,
    });
    const c = await trialCard();
    const at = (iso: string) => zoneName(TRIAL_ZONE, 'en-GB', iso);
    expect(c.textContent).toContain(`Eligible since 12 October 2026 at 11:00 (${at('2026-10-12T10:00:00.000Z')}); registered with an email address and a WhatsApp number.`);
    expect(c.textContent).toContain(en['admin.trial.open']);
    expect(c.textContent).toContain(`Claimed by the Owner on 13 October 2026 at 10:30 (${at(TRIAL_START)}).`);
    expect(c.textContent).toContain(`From 13 October 2026 at 10:30 (${at(TRIAL_START)}) to 20 October 2026 at 10:30 (${CASABLANCA}).`);
    expect(c.textContent).toContain(en['admin.trial.expiryPending']);
    expect(c.textContent).toContain(en['admin.trial.paidAfter']);
    expect(c.textContent).toContain(en['admin.trial.noAction']);
    const decisions = (await screen.findByRole('heading', { name: 'Decisions' })).closest('section')!;
    expect(within(decisions).getAllByRole('button').map((b) => b.textContent)).toEqual(['Approve', 'Refuse', 'Grant access (no payment)']);
    expect(within(await screen.findByRole('heading', { level: 1 })).queryByText('Boutique Test')).toBeTruthy();
    expect(screen.getAllByText('Free trial').length).toBeGreaterThan(0);
  });

  it('a closed eligibility says when and why; an ended trial says its end was recorded', async () => {
    business(
      {
        eligibility: { registrationMethod: 'email', createdAt: '2026-10-12T10:00:00.000Z', closedAt: '2026-10-21T09:00:00.000Z', closedReason: 'approved' },
        claim: { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: TRIAL_END, expiryRecordedAt: '2026-10-20T09:31:00.000Z' },
        timeZone: TRIAL_ZONE,
      },
      'active',
    );
    const c = await trialCard();
    expect(c.textContent).toContain('The eligibility closed on 21 October 2026 at 10:00');
    expect(c.textContent).toContain(': the business was approved.');
    expect(c.textContent).toContain('Its end was recorded on 20 October 2026 at 10:31');
  });

  it('a business created from the console has no trial, and says so', async () => {
    business({ eligibility: null, claim: null, timeZone: TRIAL_ZONE }, 'pending');
    const c = await trialCard();
    expect(c.textContent).toContain(en['admin.trial.none']);
  });

  it('the history says each kind in words and the trial’s events from the recorded claim, in the business’s zone (R4-01)', async () => {
    const claimed = `Free trial claimed on the website by the Owner: 7 days from ${TRIAL_START} to ${TRIAL_END}. Nothing was charged.`;
    business(
      {
        eligibility: { registrationMethod: 'email', createdAt: '2026-10-12T10:00:00.000Z', closedAt: '2026-10-14T08:00:00.000Z', closedReason: 'approved' },
        claim: { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: TRIAL_END, expiryRecordedAt: null },
        timeZone: TRIAL_ZONE,
      },
      'trial_active',
      [
        { id: 'e3', kind: 'approved', note: 'Approved for 1 month(s). Paid access starts when the free trial ends.', actor: 'admin@example.test', periodEndAfter: null, createdAt: '2026-10-14T08:00:00.000Z' },
        { id: 'e2', kind: 'trial_claimed', note: claimed, actor: 'user:0192f000-0000-7000-8000-0000000000c1', periodEndAfter: null, createdAt: TRIAL_START },
        { id: 'e1', kind: 'trial_eligible', note: 'Eligible for one 7-day free trial, to be claimed by the Owner on the Dukan ERP website. Not started.', actor: 'self-service', periodEndAfter: null, createdAt: '2026-10-12T10:00:00.000Z' },
      ],
    );
    const history = (await screen.findByRole('heading', { name: 'History', level: 2 })).closest('.card')!;
    const text = history.textContent!;
    const at = (iso: string) => zoneName(TRIAL_ZONE, 'en-GB', iso);
    expect(text).toContain(`Free trial started — By the Owner, on this website: from 13 October 2026 at 10:30 (${at(TRIAL_START)}) to 20 October 2026 at 10:30 (${CASABLANCA}). Nothing was charged.`);
    expect(text).toContain(`Free trial available — ${en['event.trial_eligible.note']}`);
    // The decision keeps the note its administrator's action wrote, and every row names who acted.
    expect(text).toContain('Approved — Approved for 1 month(s). Paid access starts when the free trial ends. (admin@example.test)');
    expect(text).toContain('(user:0192f000-0000-7000-8000-0000000000c1)');
    expect(text).not.toContain(claimed);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:|trial claimed|trial_/);
    const times = [...history.querySelectorAll('time')].map((t) => t.textContent);
    expect(times.slice(1)).toEqual([`13 October 2026 at 10:30 (${at(TRIAL_START)})`, `12 October 2026 at 11:00 (${at('2026-10-12T10:00:00.000Z')})`]);
  });

  it('the overview and the list name the three trial states', async () => {
    const byState = { pending: 1, trial_available: 2, trial_active: 3, trial_expired: 4, active: 5, grace: 0, complimentary: 0, suspended: 0, expired: 0, cancelled: 0, rejected: 0 };
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/dashboard')) return { body: { byState, businesses: 15, branches: 21, activeUsers: 48, pendingSeatRequests: 0, pendingStaff: 0, revenue: null, calculatedAt: TRIAL_START } };
      if (url.includes('/platform/businesses?')) return { body: { rows: [], total: 0, page: 1, pageSize: 25 } };
      return undefined;
    });
    mount('/admin');
    const overview = (await screen.findByRole('heading', { name: 'By state' })).closest('section')!;
    for (const [label, count] of [
      ['Free trial not started', '2'],
      ['Free trial', '3'],
      ['Free trial ended', '4'],
    ] as const) {
      expect(within(overview).getByText(label).closest('.row')!.textContent).toContain(count);
    }
    await userEvent.setup().click(screen.getByRole('link', { name: 'Businesses' }));
    const filter = (await screen.findByLabelText('State')) as HTMLSelectElement;
    expect([...filter.options].map((o) => o.value)).toEqual(expect.arrayContaining(['trial_available', 'trial_active', 'trial_expired']));
  });
});
