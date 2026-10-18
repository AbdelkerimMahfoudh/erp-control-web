import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { BusinessDetail, GraceUsage, NoticeLog, NoticeRow, TrialClaims } from '../src/api/types';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { BRANCHES, LINES, SLOW_WAIT, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';
import { TRIAL_ZONE, portalStatus, zoneName } from './fixtures-data';

useActivityHarness();

/*
 * The console's oversight of the lifecycle (0099; docs/101 §7): every subscription message and what became of it, the
 * grace decisions against the allowance, the free trials claimed — and, on a business's page, its grace and its
 * messages. Reads only: nothing on these pages sends, decides or changes anything. Dates in the business's zone are
 * Africa/Lagos (GMT+1), so 09:30 UTC is 10:30 there.
 */
const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
const ID = '0192f000-0000-7000-8000-0000000000b1';
const BUSINESS = { id: ID, name: 'Boutique Aicha', publicStoreId: 'ST-7Q4K' };
const LAGOS = (iso: string) => `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: TRIAL_ZONE }).format(new Date(iso))} (${zoneName(TRIAL_ZONE, 'en-GB', iso)})`;

function row(over: Partial<NoticeRow> = {}): NoticeRow {
  return {
    id: `n-${Math.random()}`,
    kind: 'paid_reminder',
    threshold: 'h72',
    variant: null,
    state: 'accepted',
    channel: 'whatsapp',
    destination: '+222••••1234',
    fallbackReason: null,
    failureReason: null,
    cancelReason: null,
    attempts: 1,
    resend: false,
    dueAt: '2026-10-29T09:30:00.000Z',
    acceptedAt: '2026-10-29T09:30:05.000Z',
    completedAt: '2026-10-29T09:30:05.000Z',
    createdAt: '2026-10-29T09:30:00.000Z',
    business: BUSINESS,
    ...over,
  };
}

function admin(path: string, extra: Handler) {
  const sent = serve((url, body) => {
    const own = extra(url, body);
    if (own) return own;
    if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
    return undefined;
  });
  mount(path);
  return sent;
}

describe('the console: every subscription message', () => {
  const log = (rows: NoticeRow[]): NoticeLog => ({ rows, total: rows.length, page: 1, pageSize: 50, byState: { pending: 2, sending: 0, accepted: 31, delivered: 12, failed: 3, cancelled: 4, superseded: 1 } });

  it('lists which message, for which business, by which channel to which masked destination, what became of it and why', async () => {
    admin('/admin/messages', (url) =>
      url.includes('/platform/notices')
        ? {
            body: log([
              row({ kind: 'portal_instructions', threshold: 'resend:x', resend: true, channel: 'email', destination: 'o•••@example.test', fallbackReason: 'number_undeliverable' }),
              row({ kind: 'grace_ended', threshold: 'end', state: 'failed', channel: null, destination: null, failureReason: 'opted_out', acceptedAt: null }),
              row({ kind: 'trial_reminder', threshold: 'h24', state: 'cancelled', cancelReason: 'suspended', acceptedAt: null }),
            ]),
          }
        : undefined,
    );
    const table = (await screen.findByRole('table', {}, SLOW_WAIT)) as HTMLTableElement;
    const rows = [...table.querySelectorAll('tbody tr')].map((r) => r.textContent);
    expect(rows[0]).toContain('how to start your free trial');
    expect(rows[0]).toContain(en['admin.messages.resend']);
    expect(rows[0]).toContain('by email to o•••@example.test');
    expect(rows[0]).toContain(en['admin.messages.reason.fallback.number_undeliverable']);
    expect(rows[1]).toContain('grace period ended');
    expect(rows[1]).toContain(en['admin.messages.reason.failure.opted_out']);
    expect(rows[2]).toContain('free trial reminder, 24 hours before it ends');
    expect(rows[2]).toContain(en['admin.messages.reason.cancel.suspended']);
    // Each business links to its page; each state is a badge in colour and words; every state is counted above.
    expect(within(table).getAllByRole('link', { name: 'Boutique Aicha' })[0]!.getAttribute('href')).toBe(`/admin/businesses/${ID}`);
    expect(within(table).getByText('not sent').className).toBe('badge tone-danger');
    expect(screen.getByText('31')).toBeTruthy();
    // The masked destination is all the console ever shows.
    expect(document.body.textContent).not.toMatch(/\+22236|owner@example/);
  });

  it('narrows by state and by message, from the first page', async () => {
    const sent = admin('/admin/messages', (url) => (url.includes('/platform/notices') ? { body: log([row()]) } : undefined));
    await screen.findByRole('table', {}, SLOW_WAIT);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(en['admin.messages.state']), 'failed');
    await user.selectOptions(screen.getByLabelText(en['admin.messages.message']), 'grace_ended');
    await waitFor(() => expect(sent.some((r) => r.url.endsWith('/platform/notices?page=1&state=failed&kind=grace_ended'))).toBe(true));
    // Reads only: the page sends nothing but GETs.
    expect(sent.filter((r) => r.method !== 'GET')).toEqual([]);
  });
});

describe('the console: the grace decisions', () => {
  const usage: GraceUsage = {
    rules: { allowance: 3, windowMonths: 12, durationHours: 72 },
    summary: { running: 2, atAllowance: 1, withUse: 5 },
    rows: [
      { id: 'g1', business: BUSINESS, decision: 'granted', periodEnd: '2026-11-01T09:30:00.000Z', startedAt: '2026-11-01T09:30:00.000Z', endsAt: '2026-11-04T09:30:00.000Z', usesBefore: 1, recordedBy: 'evaluation', recordedAt: '2026-11-01T09:31:00.000Z', running: true, timeZone: TRIAL_ZONE },
      { id: 'g2', business: { ...BUSINESS, id: 'other', name: 'Agence Ksar' }, decision: 'refused', periodEnd: '2026-10-20T09:30:00.000Z', startedAt: '2026-10-20T09:30:00.000Z', endsAt: '2026-10-20T09:30:00.000Z', usesBefore: 3, recordedBy: 'sweeper', recordedAt: '2026-10-20T09:31:00.000Z', running: false, timeZone: TRIAL_ZONE },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
    calculatedAt: '2026-11-02T12:00:00.000Z',
  };

  it('each decision with its period end and grace end in the business’s zone, what was used before it, and how things stand now', async () => {
    admin('/admin/grace', (url) => (url.includes('/platform/grace') ? { body: usage } : undefined));
    const table = (await screen.findByRole('table', {}, SLOW_WAIT)) as HTMLTableElement;
    const [granted, refused] = [...table.querySelectorAll('tbody tr')];
    expect(granted!.textContent).toContain(LAGOS('2026-11-01T09:30:00.000Z'));
    expect(granted!.textContent).toContain(LAGOS('2026-11-04T09:30:00.000Z'));
    expect(within(granted as HTMLElement).getByText('Granted').className).toBe('badge tone-ok');
    expect(within(granted as HTMLElement).getByText('Running').className).toBe('badge tone-info');
    expect(granted!.textContent).toContain('1 of 3');
    expect(within(refused as HTMLElement).getByText('None available').className).toBe('badge tone-warn');
    expect(refused!.textContent).toContain('3 of 3');
    expect(refused!.textContent).toContain(en['admin.grace.recordedBy.sweeper']);
    expect(screen.getByText(en['admin.grace.running']).previousElementSibling!.textContent).toBe('2');
    expect(screen.getByText(en['admin.grace.atAllowance']).previousElementSibling!.textContent).toBe('1');
  });
});

describe('the console: the free trials claimed', () => {
  const claims: TrialClaims = {
    summary: { active: 4, expired: 9, eligibleUnclaimed: 6 },
    rows: [
      { id: 't1', business: BUSINESS, registrationMethod: 'phone', status: 'active', claimedAt: '2026-10-30T08:00:00.000Z', endsAt: '2026-11-06T08:00:00.000Z', expiryRecordedAt: null, termsVersion: '2026-10-18', timeZone: TRIAL_ZONE },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
    calculatedAt: '2026-11-02T12:00:00.000Z',
  };

  it('each claim and its exact end in the business’s zone, running or ended, and the eligible businesses that have not claimed', async () => {
    const sent = admin('/admin/trials', (url) => (url.includes('/platform/trial-claims') ? { body: claims } : undefined));
    const table = (await screen.findByRole('table', {}, SLOW_WAIT)) as HTMLTableElement;
    const first = table.querySelector('tbody tr')!;
    expect(first.textContent).toContain(LAGOS('2026-10-30T08:00:00.000Z'));
    expect(first.textContent).toContain(LAGOS('2026-11-06T08:00:00.000Z'));
    expect(first.textContent).toContain(en['admin.trial.method.phone']);
    expect(first.textContent).toContain('2026-10-18');
    expect(screen.getByText(en['admin.trial.list.unclaimed']).previousElementSibling!.textContent).toBe('6');
    await userEvent.setup().selectOptions(screen.getByLabelText(en['admin.trial.list.status']), 'active');
    await waitFor(() => expect(sent.some((r) => r.url.endsWith('/platform/trial-claims?page=1&status=active'))).toBe(true));
  });
});

describe('the console: a business’s grace and messages', () => {
  function business(extra?: Handler) {
    const sub = subscription(BRANCHES, LINES);
    const status = portalStatus({ state: 'grace' });
    const detail: BusinessDetail = {
      ...BUSINESS,
      city: 'Nouakchott',
      createdAt: '2026-10-12T10:00:00.000Z',
      branches: [],
      people: [],
      entitlement: {
        ...(sub.entitlement as BusinessDetail['entitlement'] & object),
        state: 'grace',
        timeZone: TRIAL_ZONE,
        grace: { ...status.grace, status: 'active', startedAt: '2026-11-01T09:30:00.000Z', endsAt: '2026-11-04T09:30:00.000Z', hoursRemaining: 31, availableAtPeriodEnd: null, usesInWindow: 2, usesRemaining: 1 },
      },
      pricing: null,
      version: 4,
      events: [],
      payments: [],
      trial: null,
    };
    return admin(`/admin/businesses/${ID}`, (url, body) => {
      const own = extra?.(url, body);
      if (own) return own;
      if (url.endsWith(`/platform/businesses/${ID}`)) return { body: detail };
      if (url.endsWith(`/platform/businesses/${ID}/seat-requests`)) return { body: [] };
      if (url.endsWith(`/platform/businesses/${ID}/notices`)) {
        return {
          body: {
            timeline: { next: { kind: 'grace_reminder', threshold: 'h24', dueAt: '2026-11-03T09:30:00.000Z' }, last: null },
            messages: [row({ kind: 'paid_expired', threshold: 'end', variant: 'grace', business: undefined, acceptedAt: '2026-11-01T09:31:00.000Z' })],
          },
        };
      }
      return undefined;
    });
  }

  it('the grace running, its end and hours left, the allowance used and when the next returns — in the business’s zone', async () => {
    business();
    const card = (await screen.findByRole('heading', { name: en['admin.business.grace.title'], level: 2 }, SLOW_WAIT)).closest('section')!;
    expect(within(card).getByText(en['admin.business.grace.status.active']).className).toBe('badge tone-warn');
    expect(card.textContent).toContain(`Ends ${LAGOS('2026-11-04T09:30:00.000Z')}`);
    expect(card.textContent).toContain('31 hours left');
    expect(card.textContent).toContain('Used in the last 12 months: 2 of 3.');
    expect(card.textContent).toContain(`Another becomes available on ${LAGOS('2027-03-01T09:30:00.000Z')}.`);
  });

  it('the next message due and the latest, each in the business’s zone', async () => {
    business();
    const card = (await screen.findByRole('heading', { name: en['admin.business.messages.title'], level: 2 }, SLOW_WAIT)).closest('section')!;
    expect(card.textContent).toContain(`Next: grace period reminder, 24 hours left, due ${LAGOS('2026-11-03T09:30:00.000Z')}.`);
    expect(card.textContent).toContain('paid period ended');
    expect(card.textContent).toContain(LAGOS('2026-11-01T09:31:00.000Z'));
    expect(card.textContent).toContain('by WhatsApp to +222••••1234');
  });

  it('in Arabic: the same, right to left, each date isolated', async () => {
    localStorage.setItem('erp.web.language', 'ar');
    business();
    const card = (await screen.findByRole('heading', { name: ar['admin.business.grace.title'], level: 2 }, SLOW_WAIT)).closest('section')!;
    expect(document.documentElement.dir).toBe('rtl');
    expect(within(card).getByText(ar['admin.business.grace.status.active'])).toBeTruthy();
    expect([...card.querySelectorAll('bdi')].some((b) => b.textContent!.includes(zoneName(TRIAL_ZONE, 'ar-MR', '2026-11-04T09:30:00.000Z')))).toBe(true);
  });

  it('an API without the messages route: no section, no error', async () => {
    business((url) => (url.endsWith(`/platform/businesses/${ID}/notices`) ? { status: 404, body: { message: 'Not Found' } } : undefined));
    await screen.findByRole('heading', { name: en['admin.business.grace.title'], level: 2 }, SLOW_WAIT);
    expect(screen.queryByRole('heading', { name: en['admin.business.messages.title'] })).toBeNull();
    expect(screen.queryByText(en['error.generic'])).toBeNull();
  });
});
