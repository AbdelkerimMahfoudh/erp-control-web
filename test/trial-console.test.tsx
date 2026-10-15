import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BusinessDetail, EntitlementState, PendingApplication, SeatRequest } from '../src/api/types';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { BRANCHES, LINES, SLOW_WAIT, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';
import { TRIAL_END, TRIAL_START, TRIAL_ZONE, allocation, scheduledRequest, trialView, zoneName } from './fixtures-data';

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

  function business(trial: BusinessDetail['trial'], state: EntitlementState = 'trial_active', events: BusinessDetail['events'] = [], extra?: Handler) {
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
    const sent = serve((url, body) => {
      const own = extra?.(url, body);
      if (own) return own;
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith(`/platform/businesses/${ID}`)) return { body: detail };
      if (url.endsWith(`/platform/businesses/${ID}/seat-requests`)) return { body: [] };
      return undefined;
    });
    mount(`/admin/businesses/${ID}`);
    return sent;
  }

  const trialCard = async () => (await screen.findByRole('heading', { name: 'Free trial', level: 2 }, SLOW_WAIT)).closest('section')!;

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

  it('a business that had a trial: its period’s and its grant’s ends in its zone, the day it lives them (R4-11)', async () => {
    // Dubai: the trial ended at 23:30 UTC, already the next day there; the paid month and the grant ran from that end.
    const ends = '2026-10-20T23:30:00.000Z';
    const sub = subscription(BRANCHES, LINES);
    const detail: BusinessDetail = {
      id: ID,
      name: 'Boutique Test',
      publicStoreId: 'ST-7Q4K',
      city: 'Nouakchott',
      createdAt: '2026-10-12T10:00:00.000Z',
      branches: [],
      people: [],
      entitlement: {
        ...(sub.entitlement as BusinessDetail['entitlement'] & object),
        state: 'active',
        periodEnd: '2026-11-20T23:30:00.000Z',
        complimentary: { status: 'superseded', until: '2026-11-03T23:30:00.000Z', paidUntil: '2026-11-20T23:30:00.000Z' },
        trial: trialView('expired', { endsAt: ends, timeZone: 'Asia/Dubai' }),
      },
      pricing: sub.pricing as BusinessDetail['pricing'],
      version: 4,
      events: [],
      payments: [],
      trial: { eligibility: null, claim: { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: ends, expiryRecordedAt: ends }, timeZone: 'Asia/Dubai' },
    };
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith(`/platform/businesses/${ID}`)) return { body: detail };
      if (url.endsWith(`/platform/businesses/${ID}/seat-requests`)) return { body: [] };
      return undefined;
    });
    mount(`/admin/businesses/${ID}`);
    const quote = (await screen.findByRole('heading', { name: 'Your monthly total' })).closest('.card')!;
    const dubai = (date: string, iso: string) => `${date} at 03:30 (${zoneName('Asia/Dubai', 'en-GB', iso)})`;
    expect(quote.textContent).toContain(`Ends ${dubai('21 November 2026', '2026-11-20T23:30:00.000Z')}`);
    expect(quote.textContent).toContain(
      `The platform’s grant ended on ${dubai('4 November 2026', '2026-11-03T23:30:00.000Z')}. Your paid period runs until ${dubai('21 November 2026', '2026-11-20T23:30:00.000Z')}.`,
    );
    expect(quote.textContent).not.toMatch(/20 Nov 2026|3 Nov 2026/);
  });

  describe('an end date inside a running trial (R4-05)', () => {
    beforeEach(() => {
      // jsdom has no <dialog> behaviour; the step-up dialog only needs open/close.
      HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
        this.removeAttribute('open');
      };
    });
    const RUNNING = {
      eligibility: { registrationMethod: 'email' as const, createdAt: '2026-10-12T10:00:00.000Z', closedAt: null, closedReason: null },
      claim: { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: TRIAL_END, expiryRecordedAt: null },
      timeZone: TRIAL_ZONE,
    };
    /** The server's refusal, its sentence English with a raw UTC instant — never what the console shows. */
    const refusal = (detail: Record<string, unknown> = {}): Handler => (url) =>
      url.endsWith(`/platform/businesses/${ID}/approve`)
        ? { status: 400, body: { statusCode: 400, error: 'Bad Request', code: 'period_ends_before_trial_end', message: `The end date must be after the free trial ends on ${TRIAL_END}.`, ...detail } }
        : undefined;

    async function approveWithEndDate(date: string) {
      const user = userEvent.setup();
      const decisions = (await screen.findByRole('heading', { name: /Decisions|Décisions/ })).closest('section')!;
      await user.click(within(decisions).getByRole('button', { name: /^(Approve|Approuver)$/ }));
      await user.type(decisions.querySelector('input[type="date"]') as HTMLInputElement, date);
      await user.click(within(decisions).getByRole('button', { name: /^(Confirm|Confirmer)$/ }));
      await user.type(await screen.findByLabelText(/^(Password|Mot de passe)$/), 'step-up-password');
      await user.type(screen.getByLabelText(/authenticator|authentification/i), '123456');
      await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: /^(Confirm|Confirmer)$/, hidden: true }));
      return decisions;
    }

    it('the date field says the end must be after the trial’s, in the business’s zone, before anything is sent', async () => {
      business(RUNNING);
      const decisions = (await screen.findByRole('heading', { name: 'Decisions' })).closest('section')!;
      await userEvent.setup().click(within(decisions).getByRole('button', { name: 'Approve' }));
      const field = (decisions.querySelector('input[type="date"]') as HTMLInputElement).closest('label')!;
      expect(field.textContent).toContain(`A free trial is running: the end date must be after it ends, on 20 October 2026 at 10:30 (${CASABLANCA}).`);
      expect(field.querySelector('bdi')?.textContent).toBe(`20 October 2026 at 10:30 (${CASABLANCA})`);
    });

    it('refused: a title of its own and the trial’s end in the business’s zone — not "something went wrong", not the server’s UTC sentence', async () => {
      business(RUNNING, 'trial_active', [], refusal());
      const decisions = await approveWithEndDate('2026-10-15');
      await waitFor(() => expect(decisions.textContent).toContain(en['admin.trial.periodEnd.title']));
      expect(decisions.textContent).toContain(`The end date must be after the free trial ends, on 20 October 2026 at 10:30 (${CASABLANCA}). Choose a later date.`);
      expect(decisions.textContent).not.toContain(en['error.generic']);
      expect(decisions.textContent).not.toContain(TRIAL_END);
      expect(decisions.textContent).not.toContain('period_ends_before_trial_end');
    });

    it('the end the server names in its refusal comes first, said in French in the business’s zone', async () => {
      localStorage.setItem('erp.web.language', 'fr');
      business(RUNNING, 'trial_active', [], refusal({ trialEndsAt: '2026-10-21T09:30:00.000Z' }));
      const decisions = await approveWithEndDate('2026-10-15');
      await waitFor(() => expect(decisions.textContent).toContain(fr['admin.trial.periodEnd.title']));
      expect(decisions.textContent).toContain(`le 21 octobre 2026 à 10:30 (${zoneName(TRIAL_ZONE, 'fr-FR', '2026-10-21T09:30:00.000Z')})`);
      expect(decisions.textContent).not.toMatch(/2026-10-2\dT/);
    });

    it('no trial running: no hint on the date', async () => {
      business({ eligibility: null, claim: null, timeZone: TRIAL_ZONE }, 'pending');
      const decisions = (await screen.findByRole('heading', { name: 'Decisions' })).closest('section')!;
      await userEvent.setup().click(within(decisions).getByRole('button', { name: 'Approve' }));
      expect(decisions.textContent).not.toContain('A free trial is running');
    });
  });

  describe('the applications queue says where each stands in words — never the raw status (R4-13)', () => {
    const row = (id: string, name: string, extra: Partial<PendingApplication>): PendingApplication => ({
      id,
      companyId: `0192f000-0000-7000-8000-0000000000${id}`,
      businessName: name,
      ownerName: 'Owner',
      city: null,
      email: 'o@example.test',
      phone: null,
      language: 'en',
      registeredAt: TRIAL_START,
      status: 'pending_activation',
      ...extra,
    });
    async function queue(rows: PendingApplication[]) {
      serve((url) => {
        if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
        if (url.endsWith('/platform/pending')) return { body: rows };
        return undefined;
      });
      mount('/admin/pending');
      await screen.findByText(rows[0]!.businessName);
      return (name: string) => screen.getByText(name).closest('tr')!;
    }

    it('the state the server computes (C8): a running trial as a free trial with its end in the business’s zone', async () => {
      const at = await queue([
        row('c1', 'Boutique Essai', { state: 'trial_active', trial: { status: 'active', endsAt: TRIAL_END, timeZone: TRIAL_ZONE } }),
        row('c2', 'Boutique Neuve', { state: 'trial_available', trial: { status: 'available', endsAt: null, timeZone: TRIAL_ZONE } }),
        row('c3', 'Boutique Finie', { state: 'trial_expired', trial: { status: 'expired', endsAt: TRIAL_END, timeZone: TRIAL_ZONE } }),
        row('c4', 'Boutique Console', { state: 'pending', trial: null }),
      ]);
      expect(at('Boutique Essai').textContent).toContain('Free trial');
      expect(at('Boutique Essai').textContent).toContain(`The free trial ends on 20 October 2026 at 10:30 (${CASABLANCA}).`);
      expect(at('Boutique Neuve').textContent).toContain('Free trial not started');
      expect(at('Boutique Finie').textContent).toContain('Free trial ended');
      expect(at('Boutique Finie').textContent).not.toContain('ends on');
      expect(at('Boutique Console').textContent).toContain('Pending review');
      for (const name of ['Boutique Essai', 'Boutique Neuve', 'Boutique Finie', 'Boutique Console']) expect(at(name).textContent).not.toMatch(/pending.activation|_/);
    });

    it('an API that sends only the status: the status in words, or unknown — and an application with no business is incomplete', async () => {
      const at = await queue([
        row('d1', 'Boutique A', {}),
        row('d2', 'Boutique B', { status: 'rejected' }),
        row('d3', 'Boutique C', { status: 'something_newer' }),
        row('d4', 'Boutique D', { companyId: null, status: 'incomplete' }),
      ]);
      expect(at('Boutique A').textContent).toContain('Awaiting approval');
      expect(at('Boutique B').textContent).toContain('Refused');
      expect(at('Boutique C').textContent).toContain('Unknown');
      expect(at('Boutique D').textContent).toContain('Incomplete');
      for (const name of ['Boutique A', 'Boutique B', 'Boutique C', 'Boutique D']) expect(at(name).textContent).not.toMatch(/pending.activation|something|_/);
    });
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

/*
 * A store or seat whose payment the platform confirms while the business's free trial runs (D176, the owner's correction
 * of 2026-10-15): it is scheduled — paid, in force nowhere — and starts when the trial ends. The console's queue lists
 * it apart, each row with its start in its own business's zone; a confirmation says what the server did, read from the
 * row it answered with; and a confirmation that would be charged twice is refused in words.
 */
describe('the console: a store or seat paid for during a trial (D176)', () => {
  const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
  const BUSINESS = { id: '0192f000-0000-7000-8000-0000000000b1', name: 'Boutique Test', publicStoreId: 'ST-7Q4K' };
  const DUBAI_BUSINESS = { id: '0192f000-0000-7000-8000-0000000000b2', name: 'Boutique Dubai', publicStoreId: 'ST-9D2B' };
  /** A store request still awaiting payment, for a business whose trial runs. */
  const PENDING_STORE: SeatRequest = {
    ...allocation({ id: '0192f000-0000-7000-8000-0000000000d1', kind: 'store', store: null, label: 'Boutique Nord', branchId: null, branchName: null, activityFrom: null, activityTo: 'electronics', activityEffective: null, monthlyAmount: 500 }),
    business: BUSINESS,
  };
  const inZone = (locale: string, zone = TRIAL_ZONE, iso = TRIAL_END) =>
    `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: zone }).format(new Date(iso))} (${zoneName(zone, locale, iso)})`;
  const AT_END = `20 October 2026 at 10:30 (${zoneName(TRIAL_ZONE)})`;

  beforeEach(() => {
    // jsdom has no <dialog> behaviour; the step-up dialog only needs open/close.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  /** A seat request for Sara, invited at Agence Centre, still awaiting payment. */
  const PENDING_SEAT: SeatRequest = {
    ...allocation({ id: '0192f000-0000-7000-8000-0000000000d2', kind: 'seat', person: { id: '0192f000-0000-7000-8000-0000000000c2', name: 'Sara' }, activityFrom: null, activityTo: null, activityEffective: null, monthlyAmount: 100 }),
    business: BUSINESS,
  };

  /** The queue, its pending requests' payments answered by `confirm`. */
  function queue(confirm: (body: unknown) => { status?: number; body: unknown }, scheduled: SeatRequest[] = [], pending: SeatRequest[] = [PENDING_STORE]) {
    const sent = serve((url, body) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/seat-requests?status=pending_payment')) return { body: pending };
      if (url.endsWith('/platform/seat-requests?status=scheduled')) return { body: scheduled };
      if (pending.some((p) => url.endsWith(`/seat-requests/${p.id}/confirm-payment`))) return confirm(body);
      return undefined;
    });
    mount('/admin/seat-requests');
    return sent;
  }

  /** Confirm the payment of the row naming `text`, through the step-up. */
  async function confirmPayment(text: string, labels = { confirmPayment: 'Confirm payment', confirm: 'Confirm', password: 'Password', code: 'Code from your authenticator' }) {
    const user = userEvent.setup();
    const row = (await screen.findByText(new RegExp(text), undefined, SLOW_WAIT)).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: labels.confirmPayment }));
    await user.type(within(row).getByLabelText(/Reference|Référence|المرجع/), 'BK-1');
    await user.click(within(row).getByRole('button', { name: labels.confirm }));
    await user.type(await screen.findByLabelText(labels.password), 'step-up-password');
    await user.type(screen.getByLabelText(labels.code), '123456');
    await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: labels.confirm, hidden: true }));
    return row;
  }

  it('the queue lists them under "Paid · scheduled", each with its start in its own business’s zone, and offers no action on them', async () => {
    const sent = queue(() => ({ body: {} }), [
      { ...scheduledRequest('store'), business: BUSINESS },
      { ...scheduledRequest('seat', {}, { timeZone: 'Asia/Dubai' }), business: DUBAI_BUSINESS },
    ]);
    const filter = (await screen.findByDisplayValue('Awaiting payment', undefined, SLOW_WAIT)) as HTMLSelectElement;
    expect([...filter.options].map((o) => [o.value, o.textContent])).toEqual([
      ['pending_payment', 'Awaiting payment'],
      ['scheduled', 'Paid · scheduled'],
      ['paid', 'Paid'],
      ['granted', 'Granted'],
      ['released', 'Withdrawn'],
      ['refused', 'Refused'],
    ]);
    await userEvent.setup().selectOptions(filter, 'scheduled');
    const store = (await screen.findByText(/Boutique Nord/, undefined, SLOW_WAIT)).closest('tr')!;
    expect(sent.some((r) => r.url.endsWith('/platform/seat-requests?status=scheduled'))).toBe(true);
    expect(within(store).getByText('Paid · scheduled')).toBeTruthy();
    expect(store.textContent).toContain(`Opens when the free trial ends, on ${AT_END}`);
    const seat = screen.getByText(/Additional seat at Agence Centre/).closest('tr')!;
    expect(within(seat).getByRole('link', { name: 'Boutique Dubai' })).toBeTruthy();
    // Each row in its own business's zone: the same instant is 13:30 in Dubai.
    expect(seat.textContent).toContain(`Starts when the free trial ends, on 20 October 2026 at 13:30 (${zoneName('Asia/Dubai')})`);
    for (const row of [store, seat]) {
      expect(within(row).queryByRole('button')).toBeNull();
      expect(row.textContent).not.toContain('Scheduled for the renewal');
    }
  });

  it('confirmed during the trial: the outcome says when it starts — the server’s instant in the business’s zone — never that the store opened', async () => {
    const sent = queue(() => ({ body: { applied: true, allocation: { ...scheduledRequest('store'), business: BUSINESS }, paymentId: 'pay1', activation: null } }));
    await confirmPayment('Boutique Nord');
    const outcome = (await screen.findByText('Payment confirmed with reference BK-1.', undefined, SLOW_WAIT)).closest('.notice')!;
    expect(outcome.textContent).toContain(
      `It starts when the business’s free trial ends, on ${AT_END}. Nothing is active or charged to a period before then; this payment covers its first paid month.`,
    );
    expect([...outcome.querySelectorAll('bdi')].map((b) => b.textContent)).toEqual([AT_END]);
    expect(outcome.textContent).not.toContain(en['admin.seats.storeOpened']);
    expect(outcome.textContent).not.toMatch(/09:30/);
    expect(sent.find((r) => r.url.endsWith('/confirm-payment'))!.body).toMatchObject({ reference: 'BK-1', expectedVersion: 1, confirmPassword: 'step-up-password' });
  });

  it('with no paid access approved yet: it starts with the first paid month — no date; the seat’s person waits for it to start', async () => {
    queue(
      () => ({
        body: {
          applied: true,
          allocation: { ...scheduledRequest('seat', { id: PENDING_SEAT.id, person: PENDING_SEAT.person }, { waitsFor: 'paid_access' }), business: BUSINESS },
          paymentId: 'pay1',
          activation: { activated: false, pending: ['seat_scheduled'] },
        },
      }),
      [],
      [PENDING_SEAT],
    );
    await confirmPayment('for Sara');
    const outcome = (await screen.findByText('Payment confirmed with reference BK-1.', undefined, SLOW_WAIT)).closest('.notice')!;
    expect(outcome.textContent).toContain(en['admin.trial.addonWaits']);
    expect(outcome.textContent).toContain('The seat is paid; the person still has to prove: the seat to start.');
    expect(outcome.querySelectorAll('bdi')).toHaveLength(0);
    expect(outcome.textContent).not.toContain(en['admin.seats.storeOpened']);
  });

  it('confirmed with a paid period in force: the server opened the store, and the outcome says so — and nothing of a start to come', async () => {
    queue(() => ({ body: { applied: true, allocation: { ...PENDING_STORE, status: 'paid', confirmedAt: TRIAL_END }, paymentId: 'pay1', activation: null } }));
    await confirmPayment('Boutique Nord');
    const outcome = (await screen.findByText('Payment confirmed with reference BK-1.', undefined, SLOW_WAIT)).closest('.notice')!;
    expect(outcome.textContent).toContain(en['admin.seats.storeOpened']);
    expect(outcome.textContent).not.toContain('free trial');
  });

  it('a confirmation that would be charged again by the first paid period is refused in words: nothing was recorded, the request still waits', async () => {
    const message =
      'This business has no paid period running and no free trial running, so a payment confirmed now would be charged again by its first paid period. Nothing was recorded. Confirm it once paid access has started, or while its free trial runs (it then starts when the trial ends).';
    queue(() => ({ status: 409, body: { statusCode: 409, error: 'Conflict', code: 'paid_period_not_started', message } }));
    const row = await confirmPayment('Boutique Nord');
    await waitFor(() => expect(row.textContent).toContain(en['admin.trial.paidPeriodNotStarted.title']), SLOW_WAIT);
    expect(row.textContent).toContain(en['admin.trial.paidPeriodNotStarted.refused']);
    expect(row.textContent).not.toContain(en['error.conflict']);
    expect(row.textContent).not.toContain(message);
    expect(row.textContent).not.toContain('paid_period_not_started');
    expect(screen.queryByText(/Payment confirmed with reference/)).toBeNull();
    // The form stays: the payment can be confirmed once paid access has started.
    expect(within(row).getByLabelText(/Reference/)).toBeTruthy();
  });

  it('in French: the queue’s filter and the refusal; in Arabic: the outcome’s date isolated in the business’s zone', async () => {
    localStorage.setItem('erp.web.language', 'fr');
    queue(() => ({ status: 409, body: { statusCode: 409, code: 'paid_period_not_started', message: 'This business has no paid period running…' } }));
    const filter = (await screen.findByDisplayValue(fr['account.requests.status.pending_payment'], undefined, SLOW_WAIT)) as HTMLSelectElement;
    expect([...filter.options].find((o) => o.value === 'scheduled')!.textContent).toBe('Payé · programmé');
    const row = await confirmPayment('Boutique Nord', { confirmPayment: fr['admin.seats.confirm'], confirm: fr['action.confirm'], password: fr['admin.password'], code: fr['admin.mfa.code'] });
    await waitFor(() => expect(row.textContent).toContain(fr['admin.trial.paidPeriodNotStarted.title']), SLOW_WAIT);
    expect(row.textContent).toContain(fr['admin.trial.paidPeriodNotStarted.refused']);
    cleanup();

    localStorage.setItem('erp.web.language', 'ar');
    queue(() => ({ body: { applied: true, allocation: { ...scheduledRequest('store'), business: BUSINESS }, paymentId: 'pay1', activation: null } }));
    await confirmPayment('Boutique Nord', { confirmPayment: ar['admin.seats.confirm'], confirm: ar['action.confirm'], password: ar['admin.password'], code: ar['admin.mfa.code'] });
    const outcome = (await screen.findByText(ar['admin.seats.confirmed'].replace('{reference}', 'BK-1'), undefined, SLOW_WAIT)).closest('.notice')!;
    const date = inZone('ar-MR');
    expect(outcome.textContent).toContain(ar['admin.trial.addonScheduled'].replace('{date}', date));
    expect([...outcome.querySelectorAll('bdi')].map((b) => b.textContent)).toEqual([date]);
  });
});
