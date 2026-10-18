import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EntitlementState, MySubscription, SeatRequest, TimelineEvent, TrialClaimResult, TrialStatus, TrialView } from '../src/api/types';
import { portalSignOut } from '../src/auth/owner';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { BRANCHES, LINES, PLAN_V3, SLOW_WAIT, activityOptions, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';
import { B2, NO_TRIAL, PORTAL_SESSION, TRIAL_END, TRIAL_START, TRIAL_ZONE, allocation, scheduledRequest, trialOffer, trialSetup, trialStatus, trialView, zoneName } from './fixtures-data';

useActivityHarness();
afterEach(async () => {
  // The portal session's CSRF token is a module variable for the visit: a test that signed in leaves none to the next.
  await portalSignOut();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

/*
 * The free trial on the Dukan ERP portal (0095, 0099; docs/101 §5): the Owner's card on /subscription, its claim with
 * the explicit confirmation, the portal instructions, and Apply ending at the portal's sign-in — every answer mocked
 * exactly as the API's contract shapes it. The business's zone is Africa/Lagos (GMT+1) unless a test says otherwise, so
 * a date shown in the server's UTC or in the runner's zone would show another hour than the one asserted.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLAIM = 'Start my 7-day free trial';
const CONFIRM = 'Yes, start it now';
const RESEND = 'Send the portal instructions again';

const LAGOS = zoneName(TRIAL_ZONE);

function claimResult(trial: TrialView = trialView('active'), replayed = false): TrialClaimResult {
  return { claimed: true, replayed, state: 'trial_active', trial, subscriptionVersion: 5 };
}

/** GET platform/my-subscription for a business in `state`, its entitlement carrying `trial` as the server would. */
function trialAccount(state: EntitlementState, trial: TrialView | null, adjust?: (s: MySubscription) => void): MySubscription {
  const sub = subscription(BRANCHES, LINES) as unknown as MySubscription;
  sub.entitlement = { ...sub.entitlement, state, periodEnd: null, canWrite: state === 'trial_active', trial };
  adjust?.(sub);
  return sub;
}

/** The account page, its trial read answered by `trial` — a status, or an HTTP status refusing it. */
function account(state: EntitlementState, trial: TrialStatus | number, extra?: Handler, adjust?: (s: MySubscription) => void) {
  const sub = trialAccount(state, typeof trial === 'number' ? null : trial.trial, adjust);
  const sent = serve((url, body) => {
    const own = extra?.(url, body);
    if (own) return own;
    if (url.endsWith('/platform/my-subscription')) return { body: sub };
    if (url.endsWith('/platform/my-subscription/trial')) {
      return typeof trial === 'number' ? { status: trial, body: { statusCode: trial, code: 'owner_only', message: 'Only the Owner.' } } : { body: trial };
    }
    if (url.endsWith('/platform/my-subscription/activity-options')) return { body: activityOptions() };
    if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
    return undefined;
  });
  mount('/subscription');
  return sent;
}

/** The two presses a claim takes: the button, then the explicit confirmation. */
async function claim(c: HTMLElement, user = userEvent.setup()) {
  await user.click(within(c).getByRole('button', { name: CLAIM }));
  await user.click(within(c).getByRole('button', { name: CONFIRM }));
}

const card = async () => (await screen.findByRole('heading', { name: '7-day free trial', level: 2 }, SLOW_WAIT)).closest('section')!;
const hero = async () => (await screen.findByRole('heading', { name: 'Boutique Test', level: 1 }, SLOW_WAIT)).closest('section')!;
/** Wait until the trial read was answered and rendered, for the cases that must show nothing. */
async function settled(sent: { url: string }[]) {
  await hero();
  await waitFor(() => expect(sent.some((r) => r.url.endsWith('/platform/my-subscription/trial'))).toBe(true));
  await act(async () => undefined);
}

describe('the Owner’s trial card on /subscription', () => {
  it('an Owner who may claim sees the terms, the end the server would set — in the business’s zone — and one button', async () => {
    const sent = account('trial_available', trialStatus());
    const c = await card();
    for (const key of ['trial.terms.free', 'trial.terms.start', 'trial.terms.once', 'trial.terms.after', 'trial.terms.paid'] as const) expect(c.textContent).toContain(en[key]);
    expect(c.textContent).toContain(`If you start it now, it ends on 20 October 2026 at 10:30 (${LAGOS}).`);
    // The date is isolated, so it keeps its own order inside an Arabic sentence.
    expect([...c.querySelectorAll('bdi')].map((b) => b.textContent)).toContain(`20 October 2026 at 10:30 (${LAGOS})`);
    expect(within(c).getAllByRole('button', { name: CLAIM })).toHaveLength(1);
    // Never the server's UTC hour; and showing the offer claimed nothing.
    expect(c.textContent).not.toMatch(/09:30/);
    expect(sent.filter((r) => r.url.includes('/trial/claim'))).toEqual([]);
    expect((await hero()).textContent).toContain('Free trial not started');
    expect((await hero()).textContent).toContain(en['status.explain.trial_available']);
  });

  it('a contact still to verify: says which and where, and offers no button', async () => {
    account(
      'trial_available',
      trialStatus({
        offer: trialOffer({ available: false, reason: 'contact_unverified', missingContacts: ['phone'] }),
        setup: trialSetup({ delivery: 'waiting_for_contact', channel: null, destination: null, lastAttemptAt: null, lastSentAt: null, destinations: [], history: [], canResendNow: false, resendBlockedBy: 'contact_unverified' }),
      }),
    );
    const c = await card();
    expect(within(c).getByText(en['trial.eligible'])).toBeTruthy();
    expect(within(c).getByText('Before you can start it, verify your WhatsApp number in the Dukan ERP app, under Your account → WhatsApp number.')).toBeTruthy();
    expect(within(c).getByText('The portal instructions will be sent automatically once your WhatsApp number is verified.')).toBeTruthy();
    expect(within(c).queryByRole('button')).toBeNull();
  });

  it('a suspended business: no button, and why', async () => {
    account('suspended', trialStatus({ state: 'suspended', trial: null, setup: null, offer: trialOffer({ available: false, reason: 'business_suspended' }) }));
    const c = await card();
    expect(within(c).getByText(en['trial.error.business_suspended'])).toBeTruthy();
    expect(within(c).queryByRole('button')).toBeNull();
  });

  it('a running trial: its recorded start and exact end, in the business’s zone — the hero says the same', async () => {
    account('trial_active', { state: 'trial_active', trial: trialView('active'), offer: null, setup: null, calculatedAt: TRIAL_START });
    const c = await card();
    expect(c.textContent).toContain(`Your free trial ends on 20 October 2026 at 10:30 (${LAGOS}).`);
    expect(c.textContent).toContain(`It started on 13 October 2026 at 10:30 (${zoneName(TRIAL_ZONE, 'en-GB', TRIAL_START)}).`);
    expect(within(c).queryByRole('button')).toBeNull();
    const h = await hero();
    expect(within(h).getByText('Free trial')).toBeTruthy();
    expect(h.textContent).toContain(`The 7-day free trial is running. It ends on 20 October 2026 at 10:30 (${LAGOS}).`);
  });

  it('an ended trial: when it ended, and that the business is read-only until paid access starts', async () => {
    account('trial_expired', { state: 'trial_expired', trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END });
    const c = await card();
    expect(c.textContent).toContain(`Your free trial ended on 20 October 2026 at 10:30 (${LAGOS}).`);
    expect(within(c).getByText(en['trial.expired.readOnly'])).toBeTruthy();
    expect(within(c).queryByRole('button')).toBeNull();
    const h = await hero();
    expect(within(h).getByText('Free trial ended')).toBeTruthy();
    expect(h.textContent).toContain('The business is read-only until paid access starts.');
  });

  it('no offer and no trial, a paid business after its trial, another role (403), an older API (404): no card, no error', async () => {
    for (const answer of [NO_TRIAL, { state: 'active' as const, trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END }, 403, 404]) {
      const sent = account(answer === 403 || answer === 404 ? 'trial_available' : 'active', answer);
      await settled(sent);
      expect(screen.queryByRole('heading', { name: '7-day free trial' })).toBeNull();
      expect(screen.queryByText(en['error.forbidden'])).toBeNull();
      expect(sent.filter((r) => r.url.includes('/trial/claim'))).toEqual([]);
      await portalSignOut();
      cleanup();
    }
  });
});

describe('the portal instructions on the card', () => {
  const AT = '2026-10-13T08:00:00.000Z';
  const when = (iso = AT, locale = 'en-GB') => `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: TRIAL_ZONE }).format(new Date(iso))} (${zoneName(TRIAL_ZONE, locale, iso)})`;

  it('sent by WhatsApp: the channel, the number the server masked and the instant it recorded, in the business’s zone — behind a disclosure', async () => {
    account('trial_available', trialStatus());
    const c = await card();
    const details = c.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')!.textContent).toBe(en['trial.setup.title']);
    expect(c.textContent).toContain(`The portal instructions were sent by WhatsApp to +222••••1234 on ${when()}.`);
    // The number keeps its own left-to-right order inside an Arabic sentence.
    expect([...c.querySelectorAll('.ltr')].map((e) => e.textContent)).toEqual(['+222••••1234']);
    expect(within(c).getByRole('button', { name: RESEND })).toHaveProperty('disabled', false);
  });

  it('sent by email for a recorded reason: where, and why WhatsApp could not carry it', async () => {
    for (const reason of ['whatsapp_disabled', 'template_unavailable', 'number_unverified', 'number_undeliverable', 'provider_refused', 'retries_exhausted', 'async_failed'] as const) {
      account('trial_available', trialStatus({ setup: trialSetup({ channel: 'email', destination: 'o•••@example.test', fallbackReason: reason }) }));
      const c = await card();
      expect(c.textContent).toContain(`The portal instructions were sent by email to o•••@example.test on ${when()}.`);
      expect(within(c).getByText(en[`notice.fallback.${reason}`])).toBeTruthy();
      await portalSignOut();
      cleanup();
    }
  });

  it('nothing carried them: said, with the recorded reason — and the claim stands, as delivery is never a condition', async () => {
    for (const reason of ['opted_out', 'no_consent', 'no_email', 'email_unavailable', 'email_failed'] as const) {
      const failed = trialSetup({
        delivery: 'failed',
        lastSentAt: null,
        failureReason: reason,
        history: [{ at: AT, trigger: 'automatic', delivery: 'failed', channel: 'whatsapp', fallbackReason: null, failureReason: reason }],
      });
      const sent = account('trial_available', trialStatus({ setup: failed }));
      const c = await card();
      expect(within(c).getByText(en['trial.setup.failed'])).toBeTruthy();
      expect(within(c).getByText(en[`notice.failure.${reason}`])).toBeTruthy();
      expect(c.textContent).not.toMatch(/were sent by/);
      expect(within(c).getByRole('button', { name: CLAIM })).toHaveProperty('disabled', false);
      expect(sent.filter((r) => r.url.includes('/trial/claim'))).toEqual([]);
      await portalSignOut();
      cleanup();
    }
  });

  it('never asked for, and a later request not sent after one that went out: each said honestly', async () => {
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'not_sent', channel: null, destination: null, lastAttemptAt: null, lastSentAt: null, history: [] }) }));
    expect(within(await card()).getByText(en['trial.setup.notSent'])).toBeTruthy();
    await portalSignOut();
    cleanup();
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'not_sent', lastAttemptAt: '2026-10-13T10:00:00.000Z', lastSentAt: AT }) }));
    const c = await card();
    // Dated by the instructions that went out, not by the newest request.
    const line = [...c.querySelectorAll('.notice')].find((n) => n.textContent!.startsWith('The portal instructions were sent'));
    expect(line?.textContent).toBe(`The portal instructions were sent on ${when()}, but the most recent request has not been sent.`);
    expect(line?.querySelector('bdi')?.textContent).toBe(when());
    expect(c.textContent).not.toContain(en['trial.setup.notSent']);
  });

  it('the WhatsApp number still to verify: sent automatically once it is — and no such promise after the automatic send went', async () => {
    const offer = trialOffer({ available: false, reason: 'contact_unverified', missingContacts: ['phone'] });
    const waiting = { delivery: 'waiting_for_contact' as const, channel: null, destination: null, lastAttemptAt: null, lastSentAt: null, destinations: [], canResendNow: false, resendBlockedBy: 'contact_unverified' as const };
    account('trial_available', trialStatus({ offer, setup: trialSetup({ ...waiting, history: [] }) }));
    const c = await card();
    expect(within(c).getByText(en['trial.setup.waiting.phone'])).toBeTruthy();
    expect(within(c).queryByRole('button', { name: RESEND })).toBeNull();
    expect(within(c).getByText(en['trial.verify.phone'])).toBeTruthy();
    await portalSignOut();
    cleanup();
    account('trial_available', trialStatus({ offer, setup: trialSetup({ ...waiting, history: [{ at: AT, trigger: 'automatic', delivery: 'sent', channel: 'whatsapp', fallbackReason: null, failureReason: null }] }) }));
    const after = await card();
    expect(after.textContent).not.toMatch(/will be sent automatically/);
    expect(within(after).getByText(en['trial.verify.phone'])).toBeTruthy();
    expect(within(after).getByText('Sent by WhatsApp')).toBeTruthy();
  });

  it('a setup status the server could not read: the offer and the claim stand, without the instructions (C3)', async () => {
    account('trial_available', trialStatus({ setup: null }));
    const c = await card();
    expect(c.textContent).toContain(`If you start it now, it ends on 20 October 2026 at 10:30 (${LAGOS}).`);
    expect(within(c).getByRole('button', { name: CLAIM })).toHaveProperty('disabled', false);
    expect(c.querySelector('details')).toBeNull();
    expect(within(c).queryByRole('button', { name: RESEND })).toBeNull();
  });

  it('lists the latest requests: when, in the business’s zone; automatic or at the Owner’s request; what became of each, in colour and words', async () => {
    const setup = trialSetup({
      delivery: 'failed',
      failureReason: 'email_failed',
      lastAttemptAt: '2026-10-13T08:30:00.000Z',
      history: [
        { at: '2026-10-13T08:30:00.000Z', trigger: 'resend', delivery: 'failed', channel: 'email', fallbackReason: 'number_undeliverable', failureReason: 'email_failed' },
        { at: '2026-10-12T07:00:00.000Z', trigger: 'automatic', delivery: 'sent', channel: 'whatsapp', fallbackReason: null, failureReason: null },
      ],
    });
    account('trial_available', trialStatus({ setup }));
    const c = await card();
    const list = within(c).getByRole('heading', { name: 'Latest requests', level: 4 }).parentElement!;
    const rows = [...list.querySelectorAll('li')];
    expect(rows.map((r) => r.textContent)).toEqual([
      `${when('2026-10-13T08:30:00.000Z')}At your requestNot sent (email)`,
      `${when('2026-10-12T07:00:00.000Z')}AutomaticSent by WhatsApp`,
    ]);
    expect(rows.map((r) => r.querySelector('.badge')!.className)).toEqual(['badge tone-danger', 'badge tone-ok']);
    // Each date isolated, so it keeps its order inside an Arabic line; a record, never a condition: the claim stands.
    expect(rows.map((r) => r.querySelector('bdi')?.textContent)).toEqual([expect.stringContaining('13 October 2026'), expect.stringContaining('12 October 2026')]);
    expect(within(c).getByRole('button', { name: CLAIM })).toHaveProperty('disabled', false);
  });

  it('the requests in French and Arabic, and no list when nothing was ever asked for', async () => {
    const history = [{ at: '2026-10-13T08:30:00.000Z', trigger: 'resend' as const, delivery: 'sent' as const, channel: 'whatsapp' as const, fallbackReason: null, failureReason: null }];
    for (const [lang, cat] of [['fr', fr], ['ar', ar]] as const) {
      localStorage.setItem('erp.web.language', lang);
      account('trial_available', trialStatus({ setup: trialSetup({ history }) }));
      const c = (await screen.findByRole('heading', { name: cat['trial.title'], level: 2 })).closest('section')!;
      const row = within(c).getByRole('heading', { name: cat['trial.setup.history'], level: 4 }).parentElement!.querySelector('li')!;
      for (const key of ['trial.setup.history.resend', 'trial.setup.history.sent.whatsapp'] as const) expect(row.textContent).toContain(cat[key]);
      expect(row.querySelector('bdi')!.textContent).toContain(zoneName(TRIAL_ZONE, lang === 'fr' ? 'fr-FR' : 'ar-MR', '2026-10-13T08:30:00.000Z'));
      await portalSignOut();
      cleanup();
    }
    localStorage.setItem('erp.web.language', 'en');
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'not_sent', channel: null, destination: null, lastAttemptAt: null, lastSentAt: null, history: [] }) }));
    const c = await card();
    expect(within(c).queryByRole('heading', { name: 'Latest requests' })).toBeNull();
  });

  it('a send again waits out the server’s limit, counted down to its instant; then the trial is read again, and the server opens the button', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const now = Date.now();
    const availableAt = now + 42_000;
    // The server's answer follows its own clock: throttled until the instant it named, open from it.
    const read = () =>
      Date.now() < availableAt
        ? trialStatus({ setup: trialSetup({ canResendNow: false, resendBlockedBy: 'throttle', resendAvailableAt: new Date(availableAt).toISOString() }) })
        : trialStatus();
    const sent = account('trial_available', read(), (url) => {
      if (url.endsWith('/trial/setup/resend')) return { body: trialSetup({ lastAttemptAt: new Date(now + 43_000).toISOString() }) };
      return url.endsWith('/platform/my-subscription/trial') ? { body: read() } : undefined;
    });
    const c = await card();
    const reads = () => sent.filter((r) => r.url.endsWith('/platform/my-subscription/trial')).length;
    const button = within(c).getByRole('button', { name: RESEND });
    expect(button).toHaveProperty('disabled', true);
    expect(c.textContent).toContain('You can send them again in 0:42.');
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(c.textContent).toContain('You can send them again in 0:22.');
    const before = reads();
    await act(async () => {
      vi.advanceTimersByTime(23_000);
    });
    // The count ended: the page asked the server rather than trust this browser's clock, and the server said yes.
    await waitFor(() => expect(reads()).toBe(before + 1));
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    expect(c.textContent).not.toMatch(/You can send them again/);
    await userEvent.setup().click(button);
    expect(await within(c).findByText(en['trial.setup.resent'])).toBeTruthy();
    // No body — the instructions go to the Owner's verified contacts, nowhere a request could name — and the CSRF token.
    expect(sent.filter((r) => r.url.endsWith('/trial/setup/resend')).map((r) => [r.method, r.body, r.csrf])).toEqual([['POST', undefined, 'csrf-for-tests']]);
  });

  it('nothing can carry them: no countdown to a limit, the button stays off and says why — however long one waits (R4-06)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const now = Date.now();
    const unavailable = trialSetup({
      delivery: 'failed',
      failureReason: 'email_unavailable',
      lastSentAt: null,
      history: [{ at: new Date(now - 30_000).toISOString(), trigger: 'automatic', delivery: 'failed', channel: 'whatsapp', fallbackReason: null, failureReason: 'email_unavailable' }],
      canResendNow: false,
      resendBlockedBy: 'unavailable',
      // The limit's own instant is still sent, but it is not what stands in the way: nothing is counted down to it.
      resendAvailableAt: new Date(now + 30_000).toISOString(),
    });
    const sent = account('trial_available', trialStatus({ setup: unavailable }));
    const c = await card();
    const button = within(c).getByRole('button', { name: RESEND });
    expect(button).toHaveProperty('disabled', true);
    expect(c.textContent).not.toMatch(/You can send them again/);
    expect(within(c).getAllByText(en['trial.setup.unavailable'])).toHaveLength(1);
    const before = sent.length;
    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });
    expect(button).toHaveProperty('disabled', true);
    expect(c.textContent).not.toMatch(/You can send them again/);
    expect(sent.slice(before).filter((r) => r.url.endsWith('/trial/setup/resend'))).toEqual([]);
  });

  it('instructions still on their way: being sent by WhatsApp to the number, read again a few seconds later until recorded (C1)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'], shouldAdvanceTime: true });
    let recorded = false;
    // Just asked for: the limit runs too, and its countdown ticking every second must not hold back the read.
    const onItsWay = trialStatus({
      setup: trialSetup({ delivery: 'sending', lastSentAt: null, history: [], canResendNow: false, resendBlockedBy: 'throttle', resendAvailableAt: new Date(Date.now() + 60_000).toISOString() }),
    });
    const sent = account('trial_available', onItsWay, (url) => (url.endsWith('/platform/my-subscription/trial') ? { body: recorded ? trialStatus() : onItsWay } : undefined));
    const c = await card();
    const line = within(c).getByText((_, el) => el?.tagName === 'P' && el.textContent === 'The portal instructions are being sent by WhatsApp to +222••••1234.');
    expect(line.querySelector('.ltr')?.textContent).toBe('+222••••1234');
    expect(c.textContent).not.toMatch(/could not be sent|have not been sent/);
    const reads = () => sent.filter((r) => r.url.endsWith('/platform/my-subscription/trial')).length;
    const before = reads();
    recorded = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(reads()).toBeGreaterThan(before));
    await waitFor(() => expect(c.textContent).toContain('were sent by WhatsApp to +222••••1234 on'));
  });

  it('on their way with no channel chosen yet: said without naming one the server has not', async () => {
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'sending', channel: null, destination: null, lastSentAt: null, history: [] }) }));
    const c = await card();
    expect(within(c).getByText(en['trial.setup.sending'])).toBeTruthy();
    expect(c.textContent).not.toMatch(/\+222••••1234/);
  });

  it('a send again the server was still delivering when it answered: said as on its way, no failure claimed, read again (C1)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'], shouldAdvanceTime: true });
    let phase: 'before' | 'sending' | 'recorded' = 'before';
    const onItsWay = trialSetup({ delivery: 'sending', canResendNow: false, resendBlockedBy: 'throttle', resendAvailableAt: new Date(Date.now() + 60_000).toISOString() });
    account('trial_available', trialStatus(), (url) => {
      if (url.endsWith('/trial/setup/resend')) {
        phase = 'sending';
        return { body: onItsWay };
      }
      return url.endsWith('/platform/my-subscription/trial') ? { body: phase === 'sending' ? trialStatus({ setup: onItsWay }) : trialStatus() } : undefined;
    });
    const c = await card();
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(within(c).getByRole('button', { name: RESEND }));
    expect(await within(c).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'The portal instructions are being sent by WhatsApp to +222••••1234.')).toBeTruthy();
    expect(within(c).queryByText(en['trial.setup.failed'])).toBeNull();
    phase = 'recorded';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(c.textContent).toContain('were sent by WhatsApp to +222••••1234 on'));
  });

  it('a long wait is told as the instant it ends, in the business’s zone', async () => {
    const at = '2026-10-13T11:00:00.000Z';
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: new Date('2026-10-13T09:00:00.000Z') });
    account('trial_available', trialStatus({ setup: trialSetup({ canResendNow: false, resendBlockedBy: 'throttle', resendAvailableAt: at }) }));
    const c = await card();
    expect(c.textContent).toContain(`You can send them again on 13 October 2026 at 12:00 (${zoneName(TRIAL_ZONE, 'en-GB', at)}).`);
  });

  it('a refused send is said in words: too soon (with the server’s instant), nothing can be sent, no trial any more', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const now = Date.now();
    const answers: Record<number, { status: number; body: unknown }> = {
      429: { status: 429, body: { statusCode: 429, code: 'too_many_requests', message: 'Too many', resendAvailableAt: new Date(now + 30_000).toISOString() } },
      503: { status: 503, body: { statusCode: 503, code: 'setup_delivery_unavailable', message: 'Unavailable' } },
      409: { status: 409, body: { statusCode: 409, code: 'trial_not_available', message: 'Not available' } },
    };
    for (const [status, text] of [
      [429, en['trial.setup.error.too_many_requests']],
      [503, en['trial.setup.error.setup_delivery_unavailable']],
      [409, en['trial.setup.error.trial_not_available']],
    ] as const) {
      const sent = account('trial_available', trialStatus(), (url) => (url.endsWith('/trial/setup/resend') ? answers[status] : undefined));
      const c = await card();
      const reads = () => sent.filter((r) => r.url.endsWith('/platform/my-subscription/trial')).length;
      const before = reads();
      await userEvent.setup().click(within(c).getByRole('button', { name: RESEND }));
      expect(await within(c).findByText(text)).toBeTruthy();
      if (status === 429) {
        expect(c.textContent).toContain('You can send them again in 0:30.');
        expect(within(c).getByRole('button', { name: RESEND })).toHaveProperty('disabled', true);
      } else {
        // What the card should say changed: it reads the trial again.
        await waitFor(() => expect(reads()).toBeGreaterThan(before));
      }
      expect(c.textContent).not.toMatch(/too_many_requests|setup_delivery_unavailable|trial_not_available/);
      await portalSignOut();
      cleanup();
    }
  });
});

describe('the claim', () => {
  it('runs only when the button is pressed, says the end the server recorded, and reads the account again', async () => {
    let claimed = false;
    const dubai = trialView('active', { timeZone: 'Asia/Dubai' });
    const sent = account('trial_available', trialStatus(), (url) => {
      if (url.endsWith('/trial/claim')) {
        claimed = true;
        return { status: 201, body: claimResult(dubai) };
      }
      if (url.endsWith('/platform/my-subscription/trial') && claimed) return { body: { state: 'trial_active', trial: dubai, offer: null, setup: null, calculatedAt: TRIAL_START } };
      return undefined;
    });
    const c = await card();
    expect(sent.filter((r) => r.url.endsWith('/trial/claim'))).toEqual([]);
    const accountReads = sent.filter((r) => r.url.endsWith('/platform/my-subscription')).length;
    await claim(c);
    // The server's end in the zone it named — Dubai's 13:30, not the offer's Lagos 10:30.
    const gulf = zoneName('Asia/Dubai');
    await waitFor(() => expect(c.textContent).toContain(`Your free trial has started. It ends on 20 October 2026 at 13:30 (${gulf}).`));
    await waitFor(() => expect(c.textContent).toContain(`Your free trial ends on 20 October 2026 at 13:30 (${gulf}).`));
    const claims = sent.filter((r) => r.url.endsWith('/trial/claim'));
    expect(claims.map((r) => [r.method, r.body])).toEqual([['POST', { idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-18' }]]);
    await waitFor(() => expect(sent.filter((r) => r.url.endsWith('/platform/my-subscription')).length).toBeGreaterThan(accountReads));
  });

  it('a retry of the same attempt sends the same key, so the server replays its answer instead of refusing a second claim', async () => {
    let attempts = 0;
    const sent = account('trial_available', trialStatus(), (url) => {
      if (!url.endsWith('/trial/claim')) return undefined;
      attempts++;
      if (attempts === 1) return { status: 502, body: { message: 'Bad gateway' } };
      if (attempts === 2) return { status: 429, body: { statusCode: 429, message: 'Too many requests' } };
      return { status: 200, body: claimResult(trialView('active'), true) };
    });
    const c = await card();
    const user = userEvent.setup();
    await claim(c, user);
    expect(await within(c).findByText(en['error.generic'])).toBeTruthy();
    // The confirmation stays open after a failure worth retrying: pressing it again is the same attempt.
    await user.click(within(c).getByRole('button', { name: CONFIRM }));
    expect(await within(c).findByText(en['trial.error.too_many_requests'])).toBeTruthy();
    await user.click(within(c).getByRole('button', { name: CONFIRM }));
    await waitFor(() => expect(c.textContent).toContain('Your free trial has started.'));
    const keys = sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => (r.body as { idempotencyKey: string }).idempotencyKey);
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
  });

  const REFUSALS: [string, number, string, Record<string, unknown>?][] = [
    ['owner_only', 403, en['trial.error.owner_only']],
    ['idempotency_conflict', 409, en['trial.error.idempotency_conflict']],
    ['trial_already_claimed', 409, en['trial.error.trial_already_claimed'], { trial: trialView('active') }],
    ['business_closed', 409, en['trial.error.business_closed']],
    ['business_suspended', 409, en['trial.error.business_suspended']],
    ['business_refused', 409, en['trial.error.business_refused']],
    ['trial_not_available', 409, en['trial.error.trial_not_available']],
    ['terms_changed', 409, en['trial.error.terms_changed'], { termsVersion: '2026-11-01' }],
    ['contact_unverified', 409, en['trial.verify.phone'], { missingContacts: ['phone'] }],
  ];
  for (const [code, status, text, details] of REFUSALS) {
    it(`a refusal (${code}) is said in words, never as its code or the server’s sentence`, async () => {
      account('trial_available', trialStatus(), (url) =>
        url.endsWith('/trial/claim') ? { status, body: { statusCode: status, code, message: `server says ${code}`, ...details } } : undefined,
      );
      const c = await card();
      await claim(c);
      expect(await within(c).findByText(text)).toBeTruthy();
      expect(c.textContent).not.toContain(code);
      expect(c.textContent).not.toContain('server says');
    });
  }

  it('a refusal the card then explains is said once: the contact still to verify', async () => {
    let refused = false;
    const blocked = trialStatus({
      offer: trialOffer({ available: false, reason: 'contact_unverified', missingContacts: ['phone'] }),
      setup: trialSetup({ delivery: 'waiting_for_contact', channel: null, destination: null, lastAttemptAt: null, lastSentAt: null, destinations: [], history: [], canResendNow: false, resendBlockedBy: 'contact_unverified' }),
    });
    account('trial_available', trialStatus(), (url) => {
      if (url.endsWith('/trial/claim')) {
        refused = true;
        return { status: 409, body: { statusCode: 409, code: 'contact_unverified', message: 'Verify first', missingContacts: ['phone'] } };
      }
      return url.endsWith('/platform/my-subscription/trial') && refused ? { body: blocked } : undefined;
    });
    const c = await card();
    await claim(c);
    await waitFor(() => expect(within(c).queryByRole('button', { name: CLAIM })).toBeNull());
    expect(within(c).getAllByText(en['trial.verify.phone'])).toHaveLength(1);
  });

  it('terms the server changed since this text: no button, and why', async () => {
    account('trial_available', trialStatus({ offer: trialOffer({ termsVersion: '2026-11-01' }) }));
    const c = await card();
    expect(within(c).getByText(en['trial.terms.changed'])).toBeTruthy();
    expect(within(c).queryByRole('button', { name: CLAIM })).toBeNull();
  });
});

describe('dates in the business’s zone, in every language', () => {
  it('the same instant is 10:30 in Lagos and 13:30 in Dubai — never the server’s UTC, never this browser’s zone', async () => {
    account('trial_available', trialStatus({ offer: trialOffer({ timeZone: 'Asia/Dubai' }) }));
    const c = await card();
    expect(c.textContent).toContain(`If you start it now, it ends on 20 October 2026 at 13:30 (${zoneName('Asia/Dubai')}).`);
    expect(c.textContent).not.toMatch(/09:30|10:30/);
  });

  it('a paid period approved during the trial starts when it ends — said in the trial’s zone', async () => {
    const running = trialView('active');
    account('trial_active', { state: 'trial_active', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
      sub.entitlement = { ...sub.entitlement, periodEnd: '2026-11-20T09:30:00.000Z', calculatedAt: TRIAL_START };
      sub.pricing.currentPeriod.periodStart = TRIAL_END;
    });
    const period = (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;
    expect(period.textContent).toContain(`Paid access starts when the free trial ends, on 20 October 2026 at 10:30 (${LAGOS}).`);
    expect(period.textContent).toContain(`Ends 20 November 2026 at 10:30 (${zoneName(TRIAL_ZONE, 'en-GB', '2026-11-20T09:30:00.000Z')})`);
  });

  it('paid access approved during the trial: the running trial says it starts at once when the trial ends — never that the business turns read-only (R4-03)', async () => {
    const running = trialView('active', { accessAfterTrial: { kind: 'paid', startsAt: TRIAL_END } });
    account('trial_active', { state: 'trial_active', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
      sub.entitlement = { ...sub.entitlement, periodEnd: '2026-11-20T09:30:00.000Z', calculatedAt: TRIAL_START };
      sub.pricing.currentPeriod.periodStart = TRIAL_END;
    });
    const c = await card();
    expect(c.textContent).toContain(`When it ends, on 20 October 2026 at 10:30 (${LAGOS}), paid access starts at once.`);
    expect(c.textContent).not.toContain(en['trial.terms.after']);
    expect(c.textContent).not.toContain(en['trial.terms.paid']);
    const period = (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;
    expect(period.textContent).toContain(`Paid access starts when the free trial ends, on 20 October 2026 at 10:30 (${LAGOS}).`);
  });

  it('a grant approved during the trial is told as the access granted, on the card and in the period — not as paid access (R4-03)', async () => {
    const running = trialView('active', { accessAfterTrial: { kind: 'granted', startsAt: TRIAL_END } });
    account('trial_active', { state: 'trial_active', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
      sub.entitlement = { ...sub.entitlement, calculatedAt: TRIAL_START, complimentary: { status: 'active', until: '2026-11-03T09:30:00.000Z', paidUntil: null } };
      sub.pricing.currentPeriod.periodStart = TRIAL_END;
    });
    const c = await card();
    expect(c.textContent).toContain(`When it ends, on 20 October 2026 at 10:30 (${LAGOS}), the access granted to your business starts at once.`);
    expect(c.textContent).not.toContain(en['trial.terms.after']);
    const period = (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;
    expect(period.textContent).toContain(`Access granted by the platform starts when the free trial ends, on 20 October 2026 at 10:30 (${LAGOS}).`);
    expect(period.textContent).not.toContain('Paid access');
  });

  it('nothing approved for after the trial: the running trial still says the business turns read-only at its end', async () => {
    account('trial_active', { state: 'trial_active', trial: trialView('active', { accessAfterTrial: null }), offer: null, setup: null, calculatedAt: TRIAL_START });
    const c = await card();
    expect(c.textContent).toContain(en['trial.terms.after']);
    expect(c.textContent).not.toMatch(/starts at once/);
  });

  it('a paid start ahead for a business suspended mid-trial is told in the trial’s zone, the day and hour the trial card says (R4-11)', async () => {
    const ends = '2026-10-20T23:30:00.000Z';
    const running = trialView('active', { endsAt: ends, timeZone: 'Asia/Dubai' });
    account('suspended', { state: 'suspended', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
      sub.entitlement = { ...sub.entitlement, state: 'suspended', periodEnd: '2026-11-20T23:30:00.000Z', calculatedAt: TRIAL_START, trial: running };
      sub.pricing.currentPeriod.periodStart = ends;
    });
    const dubai = zoneName('Asia/Dubai', 'en-GB', ends);
    const period = (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;
    expect(period.textContent).toContain(`Paid access starts when the free trial ends, on 21 October 2026 at 03:30 (${dubai}).`);
    expect(period.textContent).not.toContain('20 Oct 2026');
    expect((await card()).textContent).toContain(`Your free trial ends on 21 October 2026 at 03:30 (${dubai}).`);
  });

  describe('the ends of access decided during the trial, in its zone: the day the business itself lives — never the day before in this browser’s (R4-11)', () => {
    // Dubai: the trial ends at 23:30 UTC, already the next day there; a month's period and a 14-day grant run from it.
    const ends = '2026-10-20T23:30:00.000Z';
    const periodEnd = '2026-11-20T23:30:00.000Z';
    const grantEnd = '2026-11-03T23:30:00.000Z';
    const inDubai = (date: string, iso: string) => `${date} at 03:30 (${zoneName('Asia/Dubai', 'en-GB', iso)})`;
    const periodCard = async () => (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;

    it('a month approved during the trial, the business suspended before it ended: the period ends on 21 November', async () => {
      const running = trialView('active', { endsAt: ends, timeZone: 'Asia/Dubai' });
      account('suspended', { state: 'suspended', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
        sub.entitlement = { ...sub.entitlement, state: 'suspended', periodEnd, calculatedAt: TRIAL_START, trial: running };
        sub.pricing.currentPeriod.periodStart = ends;
      });
      const period = await periodCard();
      expect(period.textContent).toContain(`Ends ${inDubai('21 November 2026', periodEnd)}`);
      expect([...period.querySelectorAll('bdi')].map((b) => b.textContent)).toContain(inDubai('21 November 2026', periodEnd));
      expect(period.textContent).not.toContain('20 Nov 2026');
    });

    it('once the trial is over, the lead sentence gives the period’s end as the period card does', async () => {
      const ended = trialView('expired', { endsAt: ends, timeZone: 'Asia/Dubai' });
      account('active', { state: 'active', trial: ended, offer: null, setup: null, calculatedAt: '2026-10-25T08:00:00.000Z' }, undefined, (sub) => {
        sub.entitlement = { ...sub.entitlement, state: 'active', periodEnd, calculatedAt: '2026-10-25T08:00:00.000Z', trial: ended };
        sub.pricing.currentPeriod.periodStart = ends;
      });
      expect((await hero()).textContent).toContain(`Everything works. The period ends on ${inDubai('21 November 2026', periodEnd)}.`);
      expect((await periodCard()).textContent).toContain(`Ends ${inDubai('21 November 2026', periodEnd)}`);
      expect(document.body.textContent).not.toContain('20 Nov 2026');
    });

    it('a grant decided during the trial: its end, in the lead sentence and the period card alike', async () => {
      const ended = trialView('expired', { endsAt: ends, timeZone: 'Asia/Dubai' });
      account('complimentary', { state: 'complimentary', trial: ended, offer: null, setup: null, calculatedAt: '2026-10-25T08:00:00.000Z' }, undefined, (sub) => {
        sub.entitlement = { ...sub.entitlement, state: 'complimentary', periodEnd: null, calculatedAt: '2026-10-25T08:00:00.000Z', trial: ended, complimentary: { status: 'active', until: grantEnd, paidUntil: null } };
        sub.pricing.currentPeriod.periodStart = ends;
      });
      expect((await hero()).textContent).toContain(`Access was granted by the platform until ${inDubai('4 November 2026', grantEnd)}.`);
      expect((await periodCard()).textContent).toContain(`Granted by the platform until ${inDubai('4 November 2026', grantEnd)}.`);
      expect(document.body.textContent).not.toContain('3 Nov 2026');
    });
  });

  it('in Arabic the card reads right to left, the button names the trial in Arabic, and each date and number is isolated', async () => {
    localStorage.setItem('erp.web.language', 'ar');
    account('trial_available', trialStatus());
    const c = (await screen.findByRole('heading', { name: ar['trial.title'], level: 2 })).closest('section')!;
    expect(document.documentElement.dir).toBe('rtl');
    expect(within(c).getByRole('button', { name: ar['trial.claim'] })).toBeTruthy();
    const dates = [...c.querySelectorAll('bdi')].map((b) => b.textContent ?? '');
    expect(dates.some((d) => d.includes(zoneName(TRIAL_ZONE, 'ar-MR')))).toBe(true);
    // The masked number is kept left to right on its own, flowing with the Arabic sentence — never inside a <bdi>
    // with the words around it.
    const numbers = [...c.querySelectorAll('.ltr')];
    expect(numbers.map((e) => e.textContent)).toEqual(['+222••••1234']);
    expect(numbers[0]!.closest('bdi')).toBeNull();
    expect(numbers[0]!.closest('p')!.textContent).toContain(ar['notice.where.whatsapp'].replace('{destination}', '+222••••1234'));
  });

  it('in French the button says it as the setup message does', async () => {
    localStorage.setItem('erp.web.language', 'fr');
    account('trial_available', trialStatus());
    const c = (await screen.findByRole('heading', { name: fr['trial.title'], level: 2 })).closest('section')!;
    expect(within(c).getByRole('button', { name: 'Démarrer mon essai gratuit de 7 jours' })).toBeTruthy();
    expect(c.textContent).toContain(`Si vous le démarrez maintenant, il se termine le 20 octobre 2026 à 10:30 (${zoneName(TRIAL_ZONE, 'fr-FR')}).`);
  });
});

describe('the history: every event in words, the trial’s own from its facts in the business’s zone (R4-01)', () => {
  /** The notes the server writes for the trial's events: English, with raw UTC instants — never what the page shows. */
  const SERVER_NOTES = [
    'Eligible for one 7-day free trial, to be claimed by the Owner on the Dukan ERP website. Not started.',
    `Free trial claimed on the website by the Owner: 7 days from ${TRIAL_START} to ${TRIAL_END}. Nothing was charged.`,
    `The 7-day free trial ended at ${TRIAL_END}. Nothing was charged.`,
  ];
  const RECORDED = '2026-10-20T09:31:00.000Z';
  const EVENTS: TimelineEvent[] = [
    { id: 'e5', kind: 'a_kind_from_a_newer_api', note: 'Something newer.', actor: 'system', periodEndAfter: null, createdAt: RECORDED },
    { id: 'e4', kind: 'trial_expired', note: SERVER_NOTES[2]!, actor: 'system', periodEndAfter: null, createdAt: RECORDED },
    { id: 'e3', kind: 'trial_claimed', note: SERVER_NOTES[1]!, actor: 'user:0192f000-0000-7000-8000-0000000000c1', periodEndAfter: null, createdAt: TRIAL_START },
    { id: 'e2', kind: 'trial_eligible', note: SERVER_NOTES[0]!, actor: 'self-service', periodEndAfter: null, createdAt: '2026-10-12T10:00:00.000Z' },
    { id: 'e1', kind: 'registered', note: 'Registered on the website.', actor: 'self-service', periodEndAfter: null, createdAt: '2026-10-12T10:00:00.000Z' },
  ];
  const expiredAccount = () =>
    account('trial_expired', { state: 'trial_expired', trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END }, undefined, (sub) => {
      sub.events = EVENTS;
    });

  it('in French: each kind in words, the trial’s sentences with its recorded dates in Lagos time, and no server note or UTC instant', async () => {
    localStorage.setItem('erp.web.language', 'fr');
    expiredAccount();
    const history = (await screen.findByRole('heading', { name: fr['account.timeline'], level: 2 })).closest('section')!;
    const text = history.textContent!;
    for (const key of ['event.trial_expired', 'event.trial_claimed', 'event.trial_eligible', 'event.registered', 'event.unknown'] as const) expect(text).toContain(fr[key]);
    const fr2 = (iso: string) => zoneName(TRIAL_ZONE, 'fr-FR', iso);
    expect(text).toContain(`Par le propriétaire, sur ce site : du 13 octobre 2026 à 10:30 (${fr2(TRIAL_START)}) au 20 octobre 2026 à 10:30 (${fr2(TRIAL_END)}). Rien n’a été facturé.`);
    expect(text).toContain(`Il s’est terminé le 20 octobre 2026 à 10:30 (${fr2(TRIAL_END)}). Rien n’a été facturé.`);
    expect(text).toContain(fr['event.trial_eligible.note']);
    for (const note of SERVER_NOTES) expect(text).not.toContain(note);
    // Every other kind keeps the note the server wrote — the newer one too, under words of its own.
    expect(text).toContain('Registered on the website.');
    expect(text).toContain(`${fr['event.unknown']} — Something newer.`);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
    expect(text).not.toContain('_');
    // The trial's events are dated in the business's zone: the end recorded at 09:31 UTC is 10:31 there.
    const times = [...history.querySelectorAll('time')].map((t) => t.textContent);
    expect(times.slice(1, 4)).toEqual([`20 octobre 2026 à 10:31 (${fr2(RECORDED)})`, `13 octobre 2026 à 10:30 (${fr2(TRIAL_START)})`, `12 octobre 2026 à 11:00 (${fr2('2026-10-12T10:00:00.000Z')})`]);
  });

  it('in Arabic each date of the trial’s sentence is isolated, so it keeps its own order — and so is a note the server wrote in English', async () => {
    localStorage.setItem('erp.web.language', 'ar');
    expiredAccount();
    const history = (await screen.findByRole('heading', { name: ar['account.timeline'], level: 2 })).closest('section')!;
    const dates = [...history.querySelectorAll('bdi')].map((b) => b.textContent ?? '');
    expect(dates.filter((d) => d.includes(zoneName(TRIAL_ZONE, 'ar-MR')))).toHaveLength(3);
    expect(dates).toContain('Registered on the website.');
    expect(history.textContent).toContain(ar['event.trial_claimed']);
    expect(history.textContent).not.toContain('_');
  });

  it('every kind the server records has its own words in each language — no code, no kind left to a guess', async () => {
    const kinds = [
      'created', 'extended', 'branches_changed', 'seats_changed', 'complimentary_granted', 'complimentary_revoked', 'backfilled', 'registered',
      'administrative_grant', 'suspended', 'reinstated', 'cancelled', 'approved', 'rejected', 'period_corrected', 'seat_requested', 'seat_paid',
      'staff_activated', 'seat_closed', 'store_requested', 'activity_requested', 'activity_changed', 'activity_scheduled', 'renewed',
      'trial_eligible', 'trial_claimed', 'trial_expired', 'grace_started', 'grace_unavailable',
    ];
    for (const [lang, cat] of [['en', en], ['fr', fr], ['ar', ar]] as const) {
      localStorage.setItem('erp.web.language', lang);
      account('trial_active', { state: 'trial_active', trial: trialView('active'), offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
        sub.events = kinds.map((kind, i) => ({ id: `k${i}`, kind, note: null, actor: null, periodEndAfter: null, createdAt: TRIAL_START }));
      });
      const history = (await screen.findByRole('heading', { name: cat['account.timeline'], level: 2 })).closest('section')!;
      const titles = [...history.querySelectorAll('li strong')].map((e) => e.textContent);
      expect(titles).toEqual(kinds.map((k) => cat[`event.${k}` as keyof typeof en]));
      expect(new Set(titles).size).toBe(kinds.length);
      expect(history.textContent).not.toContain('_');
      await portalSignOut();
      cleanup();
    }
  });

  /*
   * A paid period end's grace decision (0099): told in the catalogue's words with the period end the server recorded,
   * in the business's zone — never the server's English note, whose instants are raw UTC.
   */
  const PERIOD_END = '2026-10-17T06:24:30.565Z';
  const GRACE_NOTES = [
    'The paid period ended: 72 hours of grace started (1 of 3 in 12 months).',
    'The paid period ended with the 3 grace periods of the last 12 months already used: no grace.',
  ];
  const GRACE_EVENTS: TimelineEvent[] = [
    { id: 'g3', kind: 'grace_unavailable', note: GRACE_NOTES[1]!, actor: 'system', periodEndAfter: PERIOD_END, createdAt: '2026-10-20T07:00:00.000Z' },
    { id: 'g2', kind: 'grace_started', note: GRACE_NOTES[0]!, actor: 'system', periodEndAfter: PERIOD_END, createdAt: '2026-10-17T06:25:00.000Z' },
    { id: 'g1', kind: 'grace_started', note: GRACE_NOTES[0]!, actor: 'system', periodEndAfter: null, createdAt: '2026-09-01T00:00:00.000Z' },
  ];

  for (const [lang, cat, locale] of [['fr', fr, 'fr-FR'], ['ar', ar, 'ar-MR']] as const) {
    it(`grace in ${lang === 'fr' ? 'French' : 'Arabic'}: its own words, the period end in the business’s zone — never the server’s English note`, async () => {
      localStorage.setItem('erp.web.language', lang);
      account('trial_expired', { state: 'trial_expired', trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END }, undefined, (sub) => {
        sub.events = GRACE_EVENTS;
      });
      const history = (await screen.findByRole('heading', { name: cat['account.timeline'], level: 2 })).closest('section')!;
      const text = history.textContent!;
      const end = `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: TRIAL_ZONE }).format(new Date(PERIOD_END))} (${zoneName(TRIAL_ZONE, locale, PERIOD_END)})`;
      expect([...history.querySelectorAll('li strong')].map((e) => e.textContent)).toEqual([cat['event.grace_unavailable'], cat['event.grace_started'], cat['event.grace_started']]);
      for (const note of GRACE_NOTES) expect(text).not.toContain(note);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
      // An event the server recorded with no period end says so without a date.
      expect(text).toContain(cat['event.grace_started.note.undated']);
      if (lang === 'fr') {
        expect(text).toContain(cat['event.grace_started.note'].replace('{end}', end));
        expect(text).toContain(cat['event.grace_unavailable.note'].replace('{end}', end));
      } else {
        // Isolated, so the date keeps its own order inside the Arabic sentence.
        expect([...history.querySelectorAll('bdi')].map((b) => b.textContent)).toContain(end);
      }
    });
  }

  /*
   * A business that registered itself and was approved before it claimed (C18): the server gives no trial view, yet the
   * history holds the trial's eligibility. Its date is the business's — Dubai, where 22:00 UTC is already the next day —
   * from the zone the account carries; every other row keeps the date it had (this browser's zone, the runner's UTC),
   * and an API older than C18, which sends no zone, dates the eligibility as it always did.
   */
  describe('no trial view, the chance to claim closed unused: the eligibility in the business’s zone (C18)', () => {
    const ELIGIBLE_AT = '2026-10-12T22:00:00.000Z';
    const APPROVED_AT = '2026-10-13T08:00:00.000Z';
    const CLOSED: TimelineEvent[] = [
      { id: 'c3', kind: 'approved', note: 'Approved for 1 month(s).', actor: 'admin@example.test', periodEndAfter: null, createdAt: APPROVED_AT },
      { id: 'c2', kind: 'trial_eligible', note: SERVER_NOTES[0]!, actor: 'self-service', periodEndAfter: null, createdAt: ELIGIBLE_AT },
      { id: 'c1', kind: 'registered', note: 'Registered on the website.', actor: 'self-service', periodEndAfter: null, createdAt: ELIGIBLE_AT },
    ];
    const approvedAccount = (timeZone?: string) =>
      account('active', NO_TRIAL, undefined, (sub) => {
        sub.entitlement = { ...sub.entitlement, state: 'active', periodEnd: '2026-11-13T08:00:00.000Z', trial: null };
        sub.events = CLOSED;
        if (timeZone) sub.timeZone = timeZone;
      });
    const historyTimes = async (heading: string) => {
      const history = (await screen.findByRole('heading', { name: heading, level: 2 }, SLOW_WAIT)).closest('section')!;
      return { history, times: [...history.querySelectorAll('time')].map((t) => t.textContent) };
    };
    /** A server instant in a zone, with the zone's name — what formatInstant is asked to show. */
    const inZone = (locale: string, zone: string, iso: string) =>
      `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: zone }).format(new Date(iso))} (${zoneName(zone, locale, iso)})`;
    /** An event's date as the history has always shown a row of another kind: this browser's zone, no zone named. */
    const asBefore = (locale: string, iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

    for (const [lang, cat, locale, eligible, before] of [
      ['en', en, 'en-GB', '13 October 2026 at 02:00', '12 Oct 2026, 22:00'],
      ['fr', fr, 'fr-FR', '13 octobre 2026 à 02:00', '12 oct. 2026, 22:00'],
      ['ar', ar, 'ar-MR', null, null],
    ] as const) {
      it(`in ${lang === 'en' ? 'English' : lang === 'fr' ? 'French' : 'Arabic'}: the eligibility on the day the business lived it, with its zone’s name; the other rows as before`, async () => {
        localStorage.setItem('erp.web.language', lang);
        approvedAccount('Asia/Dubai');
        const { history, times } = await historyTimes(cat['account.timeline']);
        const inDubai = inZone(locale, 'Asia/Dubai', ELIGIBLE_AT);
        if (eligible) expect(inDubai).toBe(`${eligible} (${zoneName('Asia/Dubai', locale, ELIGIBLE_AT)})`);
        if (before) expect(asBefore(locale, ELIGIBLE_AT)).toBe(before);
        expect(times).toEqual([asBefore(locale, APPROVED_AT), inDubai, asBefore(locale, ELIGIBLE_AT)]);
        // The eligibility is told in the catalogue's words, never the server's English note.
        expect(history.textContent).toContain(`${cat['event.trial_eligible']} — ${cat['event.trial_eligible.note']}`);
        expect(history.textContent).not.toContain(SERVER_NOTES[0]);
      });
    }

    it('an API older than C18 sends no zone: the eligibility keeps the date it had, in every language', async () => {
      for (const [lang, cat, locale] of [['en', en, 'en-GB'], ['fr', fr, 'fr-FR'], ['ar', ar, 'ar-MR']] as const) {
        localStorage.setItem('erp.web.language', lang);
        approvedAccount();
        const { times } = await historyTimes(cat['account.timeline']);
        expect({ lang, times }).toEqual({ lang, times: [asBefore(locale, APPROVED_AT), asBefore(locale, ELIGIBLE_AT), asBefore(locale, ELIGIBLE_AT)] });
        await portalSignOut();
        cleanup();
      }
    });
  });
});

/*
 * A store or seat paid for during the trial (D176, the owner's correction of 2026-10-15): the platform confirms the
 * payment while the trial runs, and the request is "scheduled" — paid, in force nowhere — until it starts with the
 * first paid month, when the trial ends. Its row says so, with the server's instant in the row's own zone.
 */
describe('a store or seat paid for during the trial: "Paid · scheduled", and when it starts (D176)', () => {
  const RUNNING: TrialStatus = { state: 'trial_active', trial: trialView('active'), offer: null, setup: null, calculatedAt: TRIAL_START };
  /** The Owner's requests as GET my-subscription/seat-requests lists them. */
  const listing = (rows: SeatRequest[]): Handler => (url) => (url.endsWith('/platform/my-subscription/seat-requests') ? { body: rows } : undefined);
  const PENDING_STORE = allocation({
    id: '0192f000-0000-7000-8000-0000000000d4',
    kind: 'store',
    store: null,
    label: 'Boutique Sud',
    branchId: null,
    branchName: null,
    activityFrom: null,
    activityTo: 'electronics',
    activityEffective: null,
    monthlyAmount: 500,
  });
  const requestsCard = async (heading: string = en['account.requests']) => (await screen.findByRole('heading', { name: heading, level: 2 }, SLOW_WAIT)).closest('section')!;
  /** The listed row naming `text`, once the list was read. */
  async function rowOf(card: HTMLElement, text: string): Promise<HTMLElement> {
    await waitFor(() => expect(card.textContent).toContain(text), SLOW_WAIT);
    return [...card.querySelectorAll('tbody tr')].find((tr) => tr.textContent!.includes(text)) as HTMLElement;
  }
  /** The trial's end as a page must show it: in the zone the server named, with that zone's name — never UTC or this browser's. */
  const inZone = (locale: string, zone = TRIAL_ZONE, iso = TRIAL_END) =>
    `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: zone }).format(new Date(iso))} (${zoneName(zone, locale, iso)})`;
  const AT_END = `20 October 2026 at 10:30 (${LAGOS})`;

  it('a store opens, a seat starts, when the trial ends — the server’s instant in the business’s zone, isolated; no withdraw, the payment’s reference instead', async () => {
    account('trial_active', RUNNING, listing([scheduledRequest('store'), scheduledRequest('seat'), PENDING_STORE]));
    const card = await requestsCard();
    const store = await rowOf(card, 'Boutique Nord');
    expect(within(store).getByText('Paid · scheduled')).toBeTruthy();
    expect(store.textContent).toContain(`Opens when the free trial ends, on ${AT_END}`);
    expect([...store.querySelectorAll('bdi')].map((b) => b.textContent)).toEqual([AT_END]);
    expect(store.textContent).toContain('500 MRU per month');
    expect(within(store).queryByRole('button')).toBeNull();
    expect(store.querySelector('.ltr')?.textContent).toBe('BK-1');
    const seat = await rowOf(card, 'Additional seat at Agence Centre');
    expect(within(seat).getByText('Paid · scheduled')).toBeTruthy();
    expect(seat.textContent).toContain(`Starts when the free trial ends, on ${AT_END}`);
    expect(within(seat).queryByRole('button')).toBeNull();
    expect(seat.querySelector('.ltr')?.textContent).toBe('BK-2');
    // Never the server's UTC hour, never the renewal's "scheduled"; a request still awaiting payment keeps its Withdraw.
    for (const row of [store, seat]) {
      expect(row.textContent).not.toMatch(/09:30/);
      expect(row.textContent).not.toContain(en['account.requests.status.scheduled']);
    }
    const pending = await rowOf(card, 'Boutique Sud');
    expect(within(pending).getByText('Awaiting payment')).toBeTruthy();
    expect(within(pending).getByRole('button', { name: 'Withdraw' })).toBeTruthy();
  });

  it('nothing approved for after the trial: it starts with the first paid month, once paid access is approved — no date is promised', async () => {
    account('trial_active', RUNNING, listing([scheduledRequest('store', {}, { waitsFor: 'paid_access' }), scheduledRequest('seat', {}, { waitsFor: 'paid_access' })]));
    const card = await requestsCard();
    for (const name of ['Boutique Nord', 'Additional seat at Agence Centre']) {
      const row = await rowOf(card, name);
      expect(within(row).getByText('Paid · scheduled')).toBeTruthy();
      expect(row.textContent).toContain('Starts with the first paid month, once paid access is approved');
      expect(row.querySelectorAll('bdi')).toHaveLength(0);
      expect(row.textContent).not.toContain('October');
      expect(within(row).queryByRole('button')).toBeNull();
    }
  });

  it('the date is told in the zone the row itself carries: a Dubai business’s 09:30 UTC is 13:30 there', async () => {
    account('trial_active', RUNNING, listing([scheduledRequest('store', {}, { timeZone: 'Asia/Dubai' })]));
    const store = await rowOf(await requestsCard(), 'Boutique Nord');
    expect(store.textContent).toContain(`Opens when the free trial ends, on 20 October 2026 at 13:30 (${zoneName('Asia/Dubai')})`);
    expect(store.textContent).not.toMatch(/09:30|10:30/);
  });

  it('every status in its own words and colour, in English, French and Arabic — a paid add-on never reads as the renewal’s "scheduled"', async () => {
    const rows = [
      PENDING_STORE,
      scheduledRequest('store'),
      allocation({ id: '0192f000-0000-7000-8000-0000000000d5', kind: 'seat', status: 'paid', activityFrom: null, activityTo: null, activityEffective: null, monthlyAmount: 100 }),
      allocation({ id: '0192f000-0000-7000-8000-0000000000d6', kind: 'seat', status: 'granted', activityFrom: null, activityTo: null, activityEffective: null, monthlyAmount: 100 }),
      allocation({ id: '0192f000-0000-7000-8000-0000000000d7', kind: 'seat', status: 'released', activityFrom: null, activityTo: null, activityEffective: null, monthlyAmount: 100 }),
      allocation({ id: '0192f000-0000-7000-8000-0000000000d8', kind: 'seat', status: 'refused', activityFrom: null, activityTo: null, activityEffective: null, monthlyAmount: 100 }),
    ];
    for (const [lang, cat] of [['en', en], ['fr', fr], ['ar', ar]] as const) {
      localStorage.setItem('erp.web.language', lang);
      account('trial_active', RUNNING, listing(rows));
      const card = await requestsCard(cat['account.requests']);
      await waitFor(() => expect(card.querySelectorAll('tbody tr')).toHaveLength(rows.length), SLOW_WAIT);
      const badges = [...card.querySelectorAll('tbody .badge')].map((b) => [b.textContent, b.className]);
      expect(badges).toEqual([
        [cat['account.requests.status.pending_payment'], 'badge tone-warn'],
        [cat['account.requests.status.paidScheduled'], 'badge tone-info'],
        [cat['account.requests.status.paid'], 'badge tone-ok'],
        [cat['account.requests.status.granted'], 'badge tone-ok'],
        [cat['account.requests.status.released'], 'badge tone-muted'],
        [cat['account.requests.status.refused'], 'badge tone-danger'],
      ]);
      expect(cat['account.requests.status.paidScheduled']).not.toBe(cat['account.requests.status.scheduled']);
      expect(card.textContent).not.toContain(cat['account.requests.status.scheduled']);
      // Only what is still unpaid can be withdrawn.
      expect(within(card).getAllByRole('button', { name: cat['account.requests.withdraw'] })).toHaveLength(1);
      await portalSignOut();
      cleanup();
    }
  });

  it('in French and Arabic: the same sentences, each date in the business’s zone with its name, isolated', async () => {
    const rows = [scheduledRequest('store'), scheduledRequest('seat'), scheduledRequest('seat', { id: '0192f000-0000-7000-8000-0000000000d9', store: { id: B2, name: 'Boutique Ksar' }, branchId: B2, branchName: 'Boutique Ksar' }, { waitsFor: 'paid_access' })];
    for (const [lang, cat, locale] of [['fr', fr, 'fr-FR'], ['ar', ar, 'ar-MR']] as const) {
      localStorage.setItem('erp.web.language', lang);
      account('trial_active', RUNNING, listing(rows));
      const card = await requestsCard(cat['account.requests']);
      const date = inZone(locale);
      await waitFor(() => expect(card.textContent).toContain(cat['trial.addons.storeAtEnd'].replace('{date}', date)), SLOW_WAIT);
      expect(card.textContent).toContain(cat['trial.addons.seatAtEnd'].replace('{date}', date));
      expect(card.textContent).toContain(cat['trial.addons.waitsForPaidAccess']);
      expect([...card.querySelectorAll('tbody bdi')].map((b) => b.textContent)).toEqual([date, date]);
      expect(card.textContent).not.toContain(cat['account.requests.status.scheduled']);
      await portalSignOut();
      cleanup();
    }
    expect(inZone('fr-FR')).toBe(`20 octobre 2026 à 10:30 (${zoneName(TRIAL_ZONE, 'fr-FR')})`);
  });

  const NOTE = `During your free trial, a store or seat you request can already be paid for. It never starts during the trial: it starts when the free trial ends, on ${AT_END} — or, if paid access is not approved by then, with the first paid month, once it is.`;

  it('while the trial runs, the forms say what a request made now does: never started during the trial, the trial’s end in the business’s zone', async () => {
    account('trial_active', RUNNING, listing([PENDING_STORE]));
    const card = await requestsCard();
    await rowOf(card, 'Boutique Sud');
    expect(card.textContent).toContain(NOTE);
    // Under the forms, its date isolated; and no word of a payment counted once while no row was paid for that way.
    const note = within(card).getByText(/During your free trial/).closest('.notice')!;
    const forms = [...card.querySelectorAll('form')];
    expect(forms).toHaveLength(2);
    expect(forms[1]!.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...note.querySelectorAll('bdi')].map((b) => b.textContent)).toEqual([AT_END]);
    expect(note.textContent).not.toMatch(/MRU|09:30/);
    expect(card.textContent).not.toContain(en['trial.addons.paidNote']);
  });

  it('a business suspended while its trial runs is told the same: its trial still runs', async () => {
    account('suspended', { state: 'suspended', trial: trialView('active'), offer: null, setup: null, calculatedAt: TRIAL_START }, listing([]));
    const card = await requestsCard();
    await waitFor(() => expect(card.textContent).toContain(en['account.requests.none']), SLOW_WAIT);
    expect(card.textContent).toContain(NOTE);
  });

  it('no such note before the trial is claimed, once it ended, or for a business that never had one', async () => {
    const cases: [EntitlementState, TrialStatus][] = [
      ['trial_available', trialStatus()],
      ['trial_expired', { state: 'trial_expired', trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END }],
      ['active', NO_TRIAL],
    ];
    for (const [state, trial] of cases) {
      account(state, trial, listing([]));
      const card = await requestsCard();
      await waitFor(() => expect(card.textContent).toContain(en['account.requests.none']), SLOW_WAIT);
      expect({ state, note: card.textContent!.includes('During your free trial') }).toEqual({ state, note: false });
      await portalSignOut();
      cleanup();
    }
  });

  it('a list holding a store or seat paid for during the trial says it is paid for once; the note, in French and Arabic too', async () => {
    for (const [lang, cat, locale] of [['en', en, 'en-GB'], ['fr', fr, 'fr-FR'], ['ar', ar, 'ar-MR']] as const) {
      localStorage.setItem('erp.web.language', lang);
      account('trial_active', RUNNING, listing([scheduledRequest('seat'), PENDING_STORE]));
      const card = await requestsCard(cat['account.requests']);
      await waitFor(() => expect(card.textContent).toContain(cat['trial.addons.paidNote']), SLOW_WAIT);
      expect(card.textContent).toContain(cat['trial.addons.note'].replace('{date}', inZone(locale)));
      // Said once, under the list and above the forms.
      const paid = within(card).getByText(cat['trial.addons.paidNote']);
      expect(card.querySelector('table')!.compareDocumentPosition(paid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(paid.compareDocumentPosition(card.querySelector('form')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      await portalSignOut();
      cleanup();
    }
  });
});

describe('Apply ends at the portal’s sign-in', () => {
  it('a confirmed application leads to the portal, where the Owner signs in with the password just chosen — no token is kept, Apply claims nothing', async () => {
    let signedIn = false;
    const sent = serve((url) => {
      if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
      if (url.endsWith('/platform/register')) {
        return {
          status: 201,
          body: {
            status: 'pending',
            created: true,
            publicStoreId: 'ST-7Q4K',
            activity: 'electronics',
            verification: { destination: '+222••••1234', channel: 'phone' },
            continuation: { token: 'continuation-for-tests', expiresAt: '2026-10-13T10:00:00.000Z', expiresInSeconds: 900 },
            next: 'verify_contact',
            trialEligible: true,
          },
        };
      }
      // An older API answered the confirmation with tokens: the page keeps none of them.
      if (url.endsWith('/platform/register/verify/confirm')) return { body: { accessToken: 'never-kept', refreshToken: 'never-kept-either', expiresIn: 900 } };
      if (url.endsWith('/platform/portal/session')) return signedIn ? { body: PORTAL_SESSION } : { status: 401, body: { message: 'Unauthorized' } };
      if (url.endsWith('/platform/portal/sign-in')) {
        signedIn = true;
        return { body: { status: 'signed_in', session: PORTAL_SESSION } };
      }
      if (url.endsWith('/platform/my-subscription')) return { body: trialAccount('trial_available', trialView('available')) };
      if (url.endsWith('/platform/my-subscription/trial')) return { body: trialStatus() };
      if (url.endsWith('/platform/my-subscription/activity-options')) return { body: activityOptions() };
      if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
      return undefined;
    });
    mount('/apply');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Your name'), 'Aminetou');
    await user.type(screen.getByLabelText('Business name'), 'Boutique Test');
    await user.type(screen.getByLabelText('First store name'), 'Centre');
    await user.type(screen.getByLabelText(/WhatsApp number/), '+22236000001');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
    await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    await user.type(await screen.findByLabelText('Verification code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText(en['apply.done.trial'])).toBeTruthy();
    await user.click(screen.getByRole('link', { name: en['login.cta'] }));
    // The portal's own sign-in, with the same WhatsApp number and password.
    await user.type(await screen.findByLabelText(en['account.identifier']), '+22236000001');
    await user.type(screen.getByLabelText(en['account.password']), 'a-long-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await card()).toBeTruthy();
    expect(sent.filter((r) => r.url.endsWith('/platform/portal/sign-in')).map((r) => r.body)).toEqual([{ identifier: '+22236000001', password: 'a-long-password' }]);
    // Nothing the confirmation answered was kept or sent: no request carries a bearer, nothing is in storage.
    expect(sent.filter((r) => r.authorization !== null)).toEqual([]);
    expect(JSON.stringify({ ...localStorage })).not.toContain('never-kept');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('never-kept');
    expect(sent.filter((r) => r.url.includes('/trial/claim'))).toEqual([]);
  });

  it('an application the server does not call eligible says what it always said', async () => {
    serve((url) => {
      if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
      if (url.endsWith('/platform/register')) return { status: 201, body: { status: 'pending', created: true, publicStoreId: 'ST-7Q4K', verification: null, continuation: null, next: 'sign_in' } };
      return undefined;
    });
    mount('/apply');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Your name'), 'Aminetou');
    await user.type(screen.getByLabelText('Business name'), 'Boutique Test');
    await user.type(screen.getByLabelText('First store name'), 'Centre');
    await user.type(screen.getByLabelText(/WhatsApp number/), '+22236000001');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
    await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['apply.done.body'])).toBeTruthy();
    expect(screen.queryByText(en['apply.done.trial'])).toBeNull();
  });
});
