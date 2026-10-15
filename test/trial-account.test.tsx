import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app';
import type { EntitlementState, MySubscription, TimelineEvent, TrialClaimResult, TrialLinkOutcome, TrialStatus, TrialView } from '../src/api/types';
import { ownerLogout } from '../src/auth/owner';
import { I18nProvider } from '../src/i18n';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ThemeProvider } from '../src/theme/theme';
import { BRANCHES, LINES, PLAN_V3, activityOptions, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';
import { NO_TRIAL, TRIAL_END, TRIAL_START, TRIAL_ZONE, trialOffer, trialSetup, trialStatus, trialView, zoneName } from './fixtures-data';

useActivityHarness();
afterEach(async () => {
  // The Owner's token is a module variable for the visit: a test that signed in leaves no session to the next.
  await ownerLogout();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

/*
 * The free trial on the website (2026-10-13): the Owner's card on /account, the setup link's landing at
 * /account/trial, and Apply ending signed in — every answer mocked exactly as the SPEC's contract shapes it. The
 * business's zone is Africa/Casablanca (GMT+1) unless a test says otherwise, so a date shown in the server's UTC or in
 * the runner's zone would show another hour than the one asserted.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Shaped like the server's (43 base64url characters) and plainly fake. */
const TOKEN = 'x'.repeat(43);
const CLAIM = 'Start my 7-day free trial';
const RESEND = 'Send the setup instructions again';

const CASABLANCA = zoneName(TRIAL_ZONE);

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
  mount('/account');
  return sent;
}

const card = async () => (await screen.findByRole('heading', { name: '7-day free trial', level: 2 })).closest('section')!;
const hero = async () => (await screen.findByRole('heading', { name: 'Boutique Test', level: 1 })).closest('section')!;
/** Wait until the trial read was answered and rendered, for the cases that must show nothing. */
async function settled(sent: { url: string }[]) {
  await hero();
  await waitFor(() => expect(sent.some((r) => r.url.endsWith('/platform/my-subscription/trial'))).toBe(true));
  await act(async () => undefined);
}

describe('the Owner’s trial card on /account', () => {
  it('an Owner who may claim sees the terms, the end the server would set — in the business’s zone — and one button', async () => {
    const sent = account('trial_available', trialStatus());
    const c = await card();
    for (const key of ['trial.terms.free', 'trial.terms.start', 'trial.terms.once', 'trial.terms.after', 'trial.terms.paid'] as const) expect(c.textContent).toContain(en[key]);
    expect(c.textContent).toContain(`If you start it now, it ends on 20 October 2026 at 10:30 (${CASABLANCA}).`);
    // The date is isolated, so it keeps its own order inside an Arabic sentence.
    expect([...c.querySelectorAll('bdi')].map((b) => b.textContent)).toContain(`20 October 2026 at 10:30 (${CASABLANCA})`);
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
        offer: trialOffer({ available: false, reason: 'contact_unverified', requiredContacts: ['email', 'phone'], missingContacts: ['phone'] }),
        setup: trialSetup({ delivery: 'waiting_for_contact', sentTo: [], lastAttemptAt: null, history: [], canResendNow: false, resendBlockedBy: 'contact_unverified' }),
      }),
    );
    const c = await card();
    expect(within(c).getByText(en['trial.eligible'])).toBeTruthy();
    expect(within(c).getByText('Before you can start it, verify your WhatsApp number in the Dukan ERP app, under Your account → WhatsApp number.')).toBeTruthy();
    expect(within(c).getByText('The setup instructions will be sent automatically once your WhatsApp number is verified.')).toBeTruthy();
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
    expect(c.textContent).toContain(`Your free trial ends on 20 October 2026 at 10:30 (${CASABLANCA}).`);
    expect(c.textContent).toContain(`It started on 13 October 2026 at 10:30 (${zoneName(TRIAL_ZONE, 'en-GB', TRIAL_START)}).`);
    expect(within(c).queryByRole('button')).toBeNull();
    const h = await hero();
    expect(within(h).getByText('Free trial')).toBeTruthy();
    expect(h.textContent).toContain(`The 7-day free trial is running. It ends on 20 October 2026 at 10:30 (${CASABLANCA}).`);
  });

  it('an ended trial: when it ended, and that the business is read-only until paid access starts', async () => {
    account('trial_expired', { state: 'trial_expired', trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END });
    const c = await card();
    expect(c.textContent).toContain(`Your free trial ended on 20 October 2026 at 10:30 (${CASABLANCA}).`);
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
      await ownerLogout();
      cleanup();
    }
  });
});

describe('the setup instructions on the card', () => {
  it('sent: to the verified contacts the server masked, on the instant it recorded, in the business’s zone', async () => {
    const setup = trialSetup({
      sentTo: ['email', 'whatsapp'],
      destinations: [
        { channel: 'email', masked: 'o•••@example.test' },
        { channel: 'whatsapp', masked: '+222••••1234' },
      ],
    });
    account('trial_available', trialStatus({ setup }));
    const c = await card();
    expect(c.textContent).toContain(
      `The instructions for completing your business setup were sent to o•••@example.test and +222••••1234 on 13 October 2026 at 09:00 (${zoneName(TRIAL_ZONE, 'en-GB', '2026-10-13T08:00:00.000Z')}).`,
    );
    // Each address keeps its own left-to-right order inside an Arabic sentence.
    expect([...c.querySelectorAll('.ltr')].map((e) => e.textContent)).toEqual(['o•••@example.test', '+222••••1234']);
    expect(within(c).getByText(en['trial.setup.optional'])).toBeTruthy();
    expect(within(c).getByRole('button', { name: RESEND })).toHaveProperty('disabled', false);
  });

  it('names only the contacts a message reached', async () => {
    const setup = trialSetup({ sentTo: ['email'], destinations: [{ channel: 'email', masked: 'o•••@example.test' }, { channel: 'whatsapp', masked: '+222••••1234' }] });
    account('trial_available', trialStatus({ setup }));
    const c = await card();
    expect(c.textContent).toContain('were sent to o•••@example.test on');
    expect(c.textContent).not.toContain('+222••••1234');
  });

  it('names where the message went as the server says it: a channel with no current contact by its name, never a blank (R4-10)', async () => {
    // WhatsApp reached, the verified contacts the server lists hold only the email: the WhatsApp number is named as such.
    account('trial_available', trialStatus({ setup: trialSetup({ sentTo: ['whatsapp'], destinations: [{ channel: 'email', masked: 'o•••@example.test' }] }) }));
    const c = await card();
    const at = `13 October 2026 at 09:00 (${zoneName(TRIAL_ZONE, 'en-GB', '2026-10-13T08:00:00.000Z')})`;
    expect(c.textContent).toContain(`The instructions for completing your business setup were sent to your WhatsApp number on ${at}.`);
    expect(c.textContent).not.toContain('o•••@example.test');
    expect(c.textContent).not.toMatch(/sent to\s+on/);
    await ownerLogout();
    cleanup();
    // Sent, with no channel named at all: the date alone — never "sent to  on".
    account('trial_available', trialStatus({ setup: trialSetup({ sentTo: [] }) }));
    const unnamed = await card();
    expect(unnamed.textContent).toContain(`The instructions for completing your business setup were sent on ${at}.`);
  });

  it('in Arabic a channel named in words flows with the sentence; only a masked contact is kept left to right', async () => {
    localStorage.setItem('erp.web.language', 'ar');
    account('trial_available', trialStatus({ setup: trialSetup({ sentTo: ['email', 'whatsapp'], destinations: [{ channel: 'email', masked: 'o•••@example.test' }] }) }));
    const c = (await screen.findByRole('heading', { name: ar['trial.title'], level: 2 })).closest('section')!;
    expect([...c.querySelectorAll('.ltr')].map((e) => e.textContent)).toEqual(['o•••@example.test']);
    expect(c.textContent).toContain(`o•••@example.test و${ar['trial.setup.to.whatsapp']}`);
  });

  it('a contact still to verify after the automatic send: no promise that the instructions will go on their own', async () => {
    account(
      'trial_available',
      trialStatus({
        offer: trialOffer({ available: false, reason: 'contact_unverified', requiredContacts: ['email', 'phone'], missingContacts: ['phone'] }),
        setup: trialSetup({
          delivery: 'waiting_for_contact',
          sentTo: [],
          canResendNow: false,
          resendBlockedBy: 'contact_unverified',
          history: [{ at: '2026-10-13T08:00:00.000Z', trigger: 'automatic', email: 'accepted', whatsapp: 'not_applicable' }],
        }),
      }),
    );
    const c = await card();
    expect(c.textContent).not.toContain(en['trial.setup.waiting.phone']);
    expect(c.textContent).not.toMatch(/will be sent automatically/);
    // What there is to do is still said, and what was sent is still listed.
    expect(within(c).getByText(en['trial.verify.phone'])).toBeTruthy();
    expect(within(c).getByText('Email: sent')).toBeTruthy();
  });

  it('could not be sent, cannot be sent, not sent: each said honestly', async () => {
    for (const [delivery, text, resendBlockedBy] of [
      ['failed', en['trial.setup.failed'], null],
      ['unavailable', en['trial.setup.unavailable'], 'unavailable'],
      ['not_sent', en['trial.setup.notSent'], null],
    ] as const) {
      const canResendNow = resendBlockedBy === null;
      account('trial_available', trialStatus({ setup: trialSetup({ delivery, sentTo: [], canResendNow, resendBlockedBy }) }));
      const c = await card();
      expect(within(c).getByText(text)).toBeTruthy();
      expect(c.textContent).not.toMatch(/were sent to/);
      expect(within(c).getByRole('button', { name: RESEND })).toHaveProperty('disabled', !canResendNow);
      await ownerLogout();
      cleanup();
    }
  });

  it('a failed, unavailable or never-sent delivery still leaves the claim there and enabled — delivery is never a condition (R4-09)', async () => {
    for (const delivery of ['failed', 'unavailable', 'not_sent'] as const) {
      const sent = account(
        'trial_available',
        trialStatus({
          setup: trialSetup({
            delivery,
            sentTo: [],
            lastAttemptAt: delivery === 'not_sent' ? null : '2026-10-13T08:00:00.000Z',
            history: delivery === 'not_sent' ? [] : [{ at: '2026-10-13T08:00:00.000Z', trigger: 'automatic', email: delivery, whatsapp: 'not_applicable' }],
            canResendNow: false,
            resendBlockedBy: 'unavailable',
          }),
        }),
      );
      const c = await card();
      expect(within(c).getByRole('button', { name: CLAIM })).toHaveProperty('disabled', false);
      expect(within(c).getByText(en['trial.setup.optional'])).toBeTruthy();
      expect(sent.filter((r) => r.url.includes('/trial/claim'))).toEqual([]);
      await ownerLogout();
      cleanup();
    }
  });

  it('a setup status the server could not read: the offer and the claim stand, without the instructions (C3)', async () => {
    account('trial_available', trialStatus({ setup: null }));
    const c = await card();
    expect(c.textContent).toContain(`If you start it now, it ends on 20 October 2026 at 10:30 (${CASABLANCA}).`);
    expect(within(c).getByRole('button', { name: CLAIM })).toHaveProperty('disabled', false);
    expect(within(c).queryByRole('heading', { name: en['trial.setup.title'] })).toBeNull();
    expect(within(c).queryByRole('button', { name: RESEND })).toBeNull();
  });

  it('lists the latest attempts: each date in the business’s zone, automatic or at the Owner’s request, each channel’s outcome in words (R4-02)', async () => {
    const setup = trialSetup({
      delivery: 'failed',
      sentTo: [],
      lastAttemptAt: '2026-10-13T08:30:00.000Z',
      destinations: [
        { channel: 'email', masked: 'o•••@example.test' },
        { channel: 'whatsapp', masked: '+222••••1234' },
      ],
      history: [
        { at: '2026-10-13T08:30:00.000Z', trigger: 'resend', email: 'failed', whatsapp: 'unavailable' },
        { at: '2026-10-12T07:00:00.000Z', trigger: 'automatic', email: 'accepted', whatsapp: 'not_applicable' },
      ],
    });
    account('trial_available', trialStatus({ setup }));
    const c = await card();
    const list = within(c).getByRole('heading', { name: 'Latest attempts', level: 4 }).parentElement!;
    const rows = [...list.querySelectorAll('li')];
    expect(rows.map((r) => r.textContent)).toEqual([
      `13 October 2026 at 09:30 (${zoneName(TRIAL_ZONE, 'en-GB', '2026-10-13T08:30:00.000Z')})At your requestEmail: could not be sentWhatsApp: not available`,
      `12 October 2026 at 08:00 (${zoneName(TRIAL_ZONE, 'en-GB', '2026-10-12T07:00:00.000Z')})AutomaticEmail: sent`,
    ]);
    // Each outcome in colour and words; each date isolated, so it keeps its order inside an Arabic line.
    expect([...rows[0]!.querySelectorAll('.badge')].map((b) => b.className)).toEqual(['badge tone-danger', 'badge tone-warn']);
    expect(rows.map((r) => r.querySelector('bdi')?.textContent)).toEqual([expect.stringContaining('13 October 2026'), expect.stringContaining('12 October 2026')]);
    // A record, never a condition: the claim stands beside a failed history.
    expect(within(c).getByRole('button', { name: CLAIM })).toHaveProperty('disabled', false);
  });

  it('the attempts in French and Arabic, and no list when nothing was ever attempted', async () => {
    const history = [{ at: '2026-10-13T08:30:00.000Z', trigger: 'resend' as const, email: 'accepted' as const, whatsapp: 'failed' as const }];
    for (const [lang, cat] of [['fr', fr], ['ar', ar]] as const) {
      localStorage.setItem('erp.web.language', lang);
      account('trial_available', trialStatus({ setup: trialSetup({ history }) }));
      const c = (await screen.findByRole('heading', { name: cat['trial.title'], level: 2 })).closest('section')!;
      const row = within(c).getByRole('heading', { name: cat['trial.setup.history'], level: 4 }).parentElement!.querySelector('li')!;
      for (const key of ['trial.setup.history.resend', 'trial.setup.history.email.accepted', 'trial.setup.history.whatsapp.failed'] as const) expect(row.textContent).toContain(cat[key]);
      expect(row.querySelector('bdi')!.textContent).toContain(zoneName(TRIAL_ZONE, lang === 'fr' ? 'fr-FR' : 'ar-MR', '2026-10-13T08:30:00.000Z'));
      await ownerLogout();
      cleanup();
    }
    localStorage.setItem('erp.web.language', 'en');
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'not_sent', sentTo: [], lastAttemptAt: null, history: [] }) }));
    const c = await card();
    expect(within(c).queryByRole('heading', { name: 'Latest attempts' })).toBeNull();
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
    expect(sent.filter((r) => r.url.endsWith('/trial/setup/resend')).map((r) => [r.method, r.body])).toEqual([['POST', {}]]);
  });

  it('nothing can carry the instructions: no countdown to a limit, the button stays off and says why — however long one waits (R4-06)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const now = Date.now();
    const unavailable = trialSetup({
      delivery: 'unavailable',
      sentTo: [],
      history: [{ at: new Date(now - 30_000).toISOString(), trigger: 'automatic', email: 'not_applicable', whatsapp: 'unavailable' }],
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
    // A delivery the server called failed, with nothing to carry a new one: the button says it cannot go now.
    await ownerLogout();
    cleanup();
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'failed', sentTo: [], canResendNow: false, resendBlockedBy: 'unavailable' }) }));
    const failed = await card();
    expect(within(failed).getByRole('button', { name: RESEND })).toHaveProperty('disabled', true);
    expect(within(failed).getByText(en['trial.setup.unavailable'])).toBeTruthy();
    expect(failed.textContent).not.toMatch(/You can send them again/);
  });

  it('a contact still to verify after the automatic send: no send-again button, and the card says what to verify', async () => {
    account(
      'trial_available',
      trialStatus({
        offer: trialOffer({ available: false, reason: 'contact_unverified', requiredContacts: ['email', 'phone'], missingContacts: ['phone'] }),
        setup: trialSetup({ delivery: 'not_sent', sentTo: [], canResendNow: false, resendBlockedBy: 'contact_unverified' }),
      }),
    );
    const c = await card();
    expect(within(c).queryByRole('button', { name: RESEND })).toBeNull();
    expect(within(c).getByText(en['trial.verify.phone'])).toBeTruthy();
  });

  it('instructions still on their way: being sent to the one verified contact, read again a few seconds later until recorded (C1)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'], shouldAdvanceTime: true });
    let recorded = false;
    // Just sent: the limit runs too, and its countdown ticking every second must not hold back the read.
    const onItsWay = trialStatus({
      setup: trialSetup({ delivery: 'sending', sentTo: [], history: [], canResendNow: false, resendBlockedBy: 'throttle', resendAvailableAt: new Date(Date.now() + 60_000).toISOString() }),
    });
    const sent = account('trial_available', onItsWay, (url) => (url.endsWith('/platform/my-subscription/trial') ? { body: recorded ? trialStatus() : onItsWay } : undefined));
    const c = await card();
    const line = within(c).getByText((_, el) => el?.tagName === 'P' && el.textContent === 'The setup instructions are being sent to o•••@example.test.');
    expect(line.querySelector('.ltr')?.textContent).toBe('o•••@example.test');
    expect(c.textContent).not.toMatch(/could not be sent|have not been sent/);
    const reads = () => sent.filter((r) => r.url.endsWith('/platform/my-subscription/trial')).length;
    const before = reads();
    recorded = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(reads()).toBeGreaterThan(before));
    await waitFor(() => expect(c.textContent).toContain('were sent to o•••@example.test on'));
  });

  it('on its way to one of several verified contacts: said without naming one the server has not', async () => {
    const destinations = [
      { channel: 'email' as const, masked: 'o•••@example.test' },
      { channel: 'whatsapp' as const, masked: '+222••••1234' },
    ];
    account('trial_available', trialStatus({ setup: trialSetup({ delivery: 'sending', sentTo: [], destinations, history: [] }) }));
    const c = await card();
    expect(within(c).getByText(en['trial.setup.sending'])).toBeTruthy();
    expect(c.textContent).not.toMatch(/o•••@example\.test|\+222••••1234/);
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
    expect(await within(c).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'The setup instructions are being sent to o•••@example.test.')).toBeTruthy();
    expect(within(c).queryByText(en['trial.setup.failed'])).toBeNull();
    phase = 'recorded';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(c.textContent).toContain('were sent to o•••@example.test on'));
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
      await ownerLogout();
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
    await userEvent.setup().click(within(c).getByRole('button', { name: CLAIM }));
    // The server's end in the zone it named — Dubai's 13:30, not the offer's Casablanca 10:30.
    const gulf = zoneName('Asia/Dubai');
    await waitFor(() => expect(c.textContent).toContain(`Your free trial has started. It ends on 20 October 2026 at 13:30 (${gulf}).`));
    await waitFor(() => expect(c.textContent).toContain(`Your free trial ends on 20 October 2026 at 13:30 (${gulf}).`));
    const claims = sent.filter((r) => r.url.endsWith('/trial/claim'));
    expect(claims.map((r) => [r.method, r.body])).toEqual([['POST', { idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-13' }]]);
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
    await user.click(within(c).getByRole('button', { name: CLAIM }));
    expect(await within(c).findByText(en['error.generic'])).toBeTruthy();
    await user.click(within(c).getByRole('button', { name: CLAIM }));
    expect(await within(c).findByText(en['trial.error.too_many_requests'])).toBeTruthy();
    await user.click(within(c).getByRole('button', { name: CLAIM }));
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
      await userEvent.setup().click(within(c).getByRole('button', { name: CLAIM }));
      expect(await within(c).findByText(text)).toBeTruthy();
      expect(c.textContent).not.toContain(code);
      expect(c.textContent).not.toContain('server says');
    });
  }

  it('a refusal the card then explains is said once: the contact still to verify', async () => {
    let refused = false;
    const blocked = trialStatus({
      offer: trialOffer({ available: false, reason: 'contact_unverified', requiredContacts: ['email', 'phone'], missingContacts: ['phone'] }),
      setup: trialSetup({ delivery: 'waiting_for_contact', sentTo: [], lastAttemptAt: null, history: [], canResendNow: false, resendBlockedBy: 'contact_unverified' }),
    });
    account('trial_available', trialStatus(), (url) => {
      if (url.endsWith('/trial/claim')) {
        refused = true;
        return { status: 409, body: { statusCode: 409, code: 'contact_unverified', message: 'Verify first', missingContacts: ['phone'] } };
      }
      return url.endsWith('/platform/my-subscription/trial') && refused ? { body: blocked } : undefined;
    });
    const c = await card();
    await userEvent.setup().click(within(c).getByRole('button', { name: CLAIM }));
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

describe('the setup link’s landing (/account/trial)', () => {
  /** The real browser router on jsdom's address, so what the address bar ends up holding can be read. */
  function landing(path: string, handler: Handler) {
    window.history.replaceState(null, '', path);
    const sent = serve(handler);
    render(
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>,
    );
    return sent;
  }

  /** A signed-out visitor; `auth/login` opens a session; the link check answers `link`. */
  function signedOut(link: TrialLinkOutcome = 'valid', extra?: Handler): Handler {
    let signedIn = false;
    return (url, body) => {
      const own = extra?.(url, body);
      if (own) return own;
      if (url.endsWith('/auth/login')) {
        signedIn = true;
        return { body: { accessToken: 'owner-session-for-tests' } };
      }
      if (url.endsWith('/platform/my-subscription')) return signedIn ? { body: trialAccount('trial_available', trialView('available')) } : { status: 401, body: { message: 'Unauthorized' } };
      if (url.endsWith('/platform/my-subscription/trial/link')) return { body: { link, offer: trialOffer(), trial: trialView('available'), state: 'trial_available' } };
      if (url.endsWith('/platform/my-subscription/trial')) return { body: trialStatus() };
      if (url.endsWith('/platform/my-subscription/trial/claim')) return { status: 201, body: claimResult() };
      return undefined;
    };
  }

  function nothingKept() {
    expect(window.location.href).not.toContain(TOKEN);
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain(TOKEN);
    expect(JSON.stringify(Object.entries(sessionStorage))).not.toContain(TOKEN);
    expect(document.cookie).not.toContain(TOKEN);
  }

  async function signIn() {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email address or WhatsApp number'), 'owner@example.test');
    await user.type(screen.getByLabelText('Password'), 'a-long-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
  }

  for (const [where, path] of [
    ['the email’s #t=', `/account/trial#t=${TOKEN}`],
    ['the WhatsApp button’s ?t=', `/account/trial?t=${TOKEN}`],
  ] as const) {
    it(`takes the token from ${where} out of the address at once, keeps it in memory only, and sends nothing before sign-in`, async () => {
      const sent = landing(path, signedOut());
      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
      expect(screen.getByText(en['trial.landing.lead'])).toBeTruthy();
      expect([window.location.pathname, window.location.search, window.location.hash]).toEqual(['/account/trial', '', '']);
      nothingKept();
      // Before sign-in: one question — is there a session? — and nothing about the trial, nothing carrying the token.
      expect(sent.map((r) => r.url.replace(/^.*\/api\/v1\//, ''))).toEqual(['platform/my-subscription']);
      expect(JSON.stringify(sent)).not.toContain(TOKEN);

      await signIn();
      expect(await screen.findByRole('button', { name: CLAIM })).toBeTruthy();
      // After sign-in, the link is checked: the token in a POST body, never in an address — and nothing claimed.
      expect(sent.filter((r) => r.url.endsWith('/trial/link')).map((r) => [r.method, r.body, r.authorization])).toEqual([['POST', { token: TOKEN }, 'Bearer owner-session-for-tests']]);
      expect(sent.filter((r) => r.url.includes(TOKEN))).toEqual([]);
      expect(sent.filter((r) => r.url.endsWith('/trial/claim'))).toEqual([]);

      await userEvent.setup().click(screen.getByRole('button', { name: CLAIM }));
      expect(await screen.findByText(/Your free trial has started/)).toBeTruthy();
      expect(sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => r.body)).toEqual([{ idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-13', token: TOKEN }]);
      nothingKept();
    });
  }

  it('says what a link is worth when it no longer works, and offers the claim without it while the business can still claim', async () => {
    for (const outcome of ['expired', 'used', 'revoked', 'invalid', 'other_account'] as const) {
      const sent = landing(`/account/trial#t=${TOKEN}`, signedOut(outcome));
      await signIn();
      expect(await screen.findByText(en[`trial.error.link_${outcome}`])).toBeTruthy();
      expect(screen.getByText(en['trial.landing.withoutLink'])).toBeTruthy();
      await userEvent.setup().click(screen.getByRole('button', { name: CLAIM }));
      await screen.findByText(/Your free trial has started/);
      // A link the server refused never goes with the claim.
      expect(sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => r.body)).toEqual([{ idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-13' }]);
      await ownerLogout();
      cleanup();
    }
  });

  it('another account’s link: said, and one button signs out and keeps the link for the account it belongs to (R4-08)', async () => {
    let session = 0;
    const sent = landing(`/account/trial#t=${TOKEN}`, (url) => {
      if (url.endsWith('/auth/login')) {
        session += 1;
        return { body: { accessToken: `session-${session}` } };
      }
      if (url.endsWith('/auth/logout') || url.endsWith('/platform/portal-sign-out')) return { body: {} };
      if (url.endsWith('/platform/my-subscription')) return session > 0 ? { body: trialAccount('trial_available', trialView('available')) } : { status: 401, body: { message: 'Unauthorized' } };
      if (url.endsWith('/platform/my-subscription/trial/link')) {
        // The link was sent to the second Owner: the first one signed in is told so.
        const link: TrialLinkOutcome = session === 1 ? 'other_account' : 'valid';
        return { body: { link, offer: trialOffer(), trial: trialView('available'), state: 'trial_available' } };
      }
      if (url.endsWith('/platform/my-subscription/trial')) return { body: trialStatus() };
      if (url.endsWith('/platform/my-subscription/trial/claim')) return { status: 201, body: claimResult() };
      return undefined;
    });
    await signIn();
    expect(await screen.findByText('This link belongs to another business account.')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out and use the other account' }));
    // Signed out, the token waits in memory only — not in the address, not in storage.
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    nothingKept();
    expect(sent.filter((r) => r.url.endsWith('/auth/logout')).map((r) => r.authorization)).toEqual(['Bearer session-1']);
    await signIn();
    expect(await screen.findByRole('button', { name: CLAIM })).toBeTruthy();
    expect(screen.queryByText('This link belongs to another business account.')).toBeNull();
    // The same link, checked again for the account now signed in — and it goes with the claim only when pressed.
    expect(sent.filter((r) => r.url.endsWith('/trial/link')).map((r) => [r.body, r.authorization])).toEqual([
      [{ token: TOKEN }, 'Bearer session-1'],
      [{ token: TOKEN }, 'Bearer session-2'],
    ]);
    expect(sent.filter((r) => r.url.endsWith('/trial/claim'))).toEqual([]);
    await userEvent.setup().click(screen.getByRole('button', { name: CLAIM }));
    await screen.findByText(/Your free trial has started/);
    expect(sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => [(r.body as { token?: string }).token, r.authorization])).toEqual([[TOKEN, 'Bearer session-2']]);
    nothingKept();
  });

  it('a used link of a business already in its trial: says so, and shows the trial instead of a button', async () => {
    landing(`/account/trial#t=${TOKEN}`, signedOut('used', (url) => (url.endsWith('/trial/link') ? { body: { link: 'used', offer: null, trial: trialView('active'), state: 'trial_active' } } : undefined)));
    await signIn();
    expect(await screen.findByText(en['trial.error.link_used'])).toBeTruthy();
    expect(document.body.textContent).toContain(`Your free trial ends on 20 October 2026 at 10:30 (${CASABLANCA}).`);
    expect(screen.queryByRole('button', { name: CLAIM })).toBeNull();
    expect(screen.queryByText(en['trial.landing.withoutLink'])).toBeNull();
  });

  it('a token not even shaped like one is invalid, and is sent nowhere', async () => {
    const sent = landing('/account/trial?t=%3Cnot-a-token%3E', signedOut());
    await signIn();
    expect(await screen.findByText(en['trial.error.link_invalid'])).toBeTruthy();
    expect(sent.filter((r) => r.url.endsWith('/trial/link'))).toEqual([]);
    expect(JSON.stringify(sent)).not.toContain('not-a-token');
    expect(window.location.search).toBe('');
  });

  it('a link refused at the claim (it expired since it was checked): said, and the claim offered again without it — a new attempt, a new key', async () => {
    let refusedOnce = false;
    const sent = landing(
      `/account/trial#t=${TOKEN}`,
      signedOut('valid', (url, body) => {
        if (!url.endsWith('/trial/claim')) return undefined;
        if (!refusedOnce && (body as { token?: string }).token) {
          refusedOnce = true;
          return { status: 410, body: { statusCode: 410, code: 'link_expired', message: 'Gone' } };
        }
        return { status: 201, body: claimResult() };
      }),
    );
    await signIn();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: CLAIM }));
    expect(await screen.findByText(en['trial.error.link_expired'])).toBeTruthy();
    expect(screen.getByText(en['trial.landing.withoutLink'])).toBeTruthy();
    await user.click(screen.getByRole('button', { name: CLAIM }));
    await screen.findByText(/Your free trial has started/);
    const claims = sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => r.body as { idempotencyKey: string; token?: string });
    expect(claims.map((b) => b.token)).toEqual([TOKEN, undefined]);
    expect(claims[0]!.idempotencyKey).not.toBe(claims[1]!.idempotencyKey);
  });

  it('a link the server could not check (its error, too many attempts, no network): the ordinary claim, without the link, and a word why (R4-07)', async () => {
    for (const failure of [
      { status: 500, body: { statusCode: 500, message: 'Internal server error' } },
      { status: 429, body: { statusCode: 429, message: 'Too many requests' } },
      'network',
    ] as const) {
      const sent = landing(
        `/account/trial#t=${TOKEN}`,
        signedOut('valid', (url) => {
          if (!url.endsWith('/trial/link')) return undefined;
          if (failure === 'network') throw new TypeError('Failed to fetch');
          return failure;
        }),
      );
      await signIn();
      expect(await screen.findByText(en['trial.landing.unchecked'])).toBeTruthy();
      expect(screen.getByText(en['trial.landing.withoutLink'])).toBeTruthy();
      expect(screen.queryByText(en['error.generic'])).toBeNull();
      // The trial was read without the link, and the claim — pressed — goes without it.
      expect(sent.filter((r) => r.url.endsWith('/platform/my-subscription/trial')).length).toBeGreaterThan(0);
      await userEvent.setup().click(screen.getByRole('button', { name: CLAIM }));
      await screen.findByText(/Your free trial has started/);
      expect(sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => r.body)).toEqual([{ idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-13' }]);
      await ownerLogout();
      cleanup();
    }
  });

  it('a Manager or an Employee signed in on the link: told only the Owner can start it', async () => {
    landing(`/account/trial#t=${TOKEN}`, signedOut('valid', (url) => (url.endsWith('/trial/link') ? { status: 403, body: { statusCode: 403, code: 'owner_only', message: 'Owner only' } } : undefined)));
    await signIn();
    expect(await screen.findByText(en['trial.error.owner_only'])).toBeTruthy();
    expect(screen.queryByRole('button', { name: CLAIM })).toBeNull();
  });

  /*
   * The owner's clarification (2026-10-13): website sign-in works without the message link. The link only continues
   * to the right page after sign-in; delivery is never a second condition; nothing starts without the button.
   */
  describe('sign-in without the link (the owner’s clarification)', () => {
    /** The account page's other reads, answered, so the page an Owner reaches by signing in is whole. */
    const accountReads: Handler = (url) => {
      if (url.endsWith('/platform/my-subscription/activity-options')) return { body: activityOptions() };
      if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
      return undefined;
    };
    const failedDelivery = trialStatus({
      setup: trialSetup({ delivery: 'failed', sentTo: [], history: [{ at: '2026-10-13T08:00:00.000Z', trigger: 'automatic', email: 'failed', whatsapp: 'not_applicable' }] }),
    });
    const claims = (sent: { url: string; body: unknown }[]) => sent.filter((r) => r.url.endsWith('/trial/claim')).map((r) => r.body);

    it('the instructions failed to go out; the Owner signs in normally on /account and starts the trial there — no token anywhere', async () => {
      const sent = landing('/account', signedOut('valid', (url, body) => accountReads(url, body) ?? (url.endsWith('/platform/my-subscription/trial') ? { body: failedDelivery } : undefined)));
      await signIn();
      const c = await card();
      expect(within(c).getByText(en['trial.setup.failed'])).toBeTruthy();
      await userEvent.setup().click(within(c).getByRole('button', { name: CLAIM }));
      await waitFor(() => expect(c.textContent).toContain('Your free trial has started.'));
      expect(claims(sent)).toEqual([{ idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-13' }]);
      expect(sent.filter((r) => r.url.endsWith('/trial/link'))).toEqual([]);
    });

    it('an expired link, then the Owner opens the business account normally: the same card and the claim, the token sent nowhere else', async () => {
      const sent = landing(`/account/trial#t=${TOKEN}`, signedOut('expired', accountReads));
      await signIn();
      expect(await screen.findByText(en['trial.error.link_expired'])).toBeTruthy();
      await userEvent.setup().click(screen.getByRole('link', { name: 'Open my business account' }));
      const c = await card();
      expect(within(c).getByText(en['trial.terms.free'])).toBeTruthy();
      await userEvent.setup().click(within(c).getByRole('button', { name: CLAIM }));
      await waitFor(() => expect(c.textContent).toContain('Your free trial has started.'));
      // The expired link was looked at once, and goes with nothing after: the eligibility never depended on it.
      expect(sent.filter((r) => r.url.endsWith('/trial/link'))).toHaveLength(1);
      expect(claims(sent)).toEqual([{ idempotencyKey: expect.stringMatching(UUID), termsVersion: '2026-10-13' }]);
      nothingKept();
    });

    it('nothing is claimed without the button — not on load, at sign-in or as the page reads the trial again — in every path', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const paths: [string, string, Handler][] = [
        ['the account card', '/account', signedOut('valid', accountReads)],
        ['the account card after a failed delivery', '/account', signedOut('valid', (url, body) => accountReads(url, body) ?? (url.endsWith('/platform/my-subscription/trial') ? { body: failedDelivery } : undefined))],
        ['the landing with a valid link', `/account/trial#t=${TOKEN}`, signedOut('valid')],
        ['the landing with an expired link', `/account/trial?t=${TOKEN}`, signedOut('expired')],
        ['the landing whose link could not be checked', `/account/trial#t=${TOKEN}`, signedOut('valid', (url) => (url.endsWith('/trial/link') ? { status: 500, body: { message: 'Internal server error' } } : undefined))],
      ];
      for (const [name, path, handler] of paths) {
        const sent = landing(path, handler);
        await signIn();
        await screen.findByRole('button', { name: CLAIM });
        // Two minutes on the page: the offer is read again twice, and still nothing is claimed.
        const reads = () => sent.filter((r) => r.url.endsWith('/platform/my-subscription/trial')).length;
        const before = reads();
        await act(async () => {
          vi.advanceTimersByTime(120_000);
        });
        await waitFor(() => expect(reads()).toBeGreaterThanOrEqual(before + 2));
        expect({ name, claims: claims(sent) }).toEqual({ name, claims: [] });
        await userEvent.setup().click(screen.getByRole('button', { name: CLAIM }));
        await screen.findByText(/Your free trial has started/);
        expect({ name, claims: claims(sent).length }).toEqual({ name, claims: 1 });
        await ownerLogout();
        cleanup();
      }
    });
  });
});

describe('dates in the business’s zone, in every language', () => {
  it('the same instant is 10:30 in Casablanca and 13:30 in Dubai — never the server’s UTC, never this browser’s zone', async () => {
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
    expect(period.textContent).toContain(`Paid access starts when the free trial ends, on 20 October 2026 at 10:30 (${CASABLANCA}).`);
    expect(period.textContent).toMatch(/Ends 20 Nov 2026/);
  });

  it('paid access approved during the trial: the running trial says it starts at once when the trial ends — never that the business turns read-only (R4-03)', async () => {
    const running = trialView('active', { accessAfterTrial: { kind: 'paid', startsAt: TRIAL_END } });
    account('trial_active', { state: 'trial_active', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
      sub.entitlement = { ...sub.entitlement, periodEnd: '2026-11-20T09:30:00.000Z', calculatedAt: TRIAL_START };
      sub.pricing.currentPeriod.periodStart = TRIAL_END;
    });
    const c = await card();
    expect(c.textContent).toContain(`When it ends, on 20 October 2026 at 10:30 (${CASABLANCA}), paid access starts at once.`);
    expect(c.textContent).not.toContain(en['trial.terms.after']);
    expect(c.textContent).not.toContain(en['trial.terms.paid']);
    const period = (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;
    expect(period.textContent).toContain(`Paid access starts when the free trial ends, on 20 October 2026 at 10:30 (${CASABLANCA}).`);
  });

  it('a grant approved during the trial is told as the access granted, on the card and in the period — not as paid access (R4-03)', async () => {
    const running = trialView('active', { accessAfterTrial: { kind: 'granted', startsAt: TRIAL_END } });
    account('trial_active', { state: 'trial_active', trial: running, offer: null, setup: null, calculatedAt: TRIAL_START }, undefined, (sub) => {
      sub.entitlement = { ...sub.entitlement, calculatedAt: TRIAL_START, complimentary: { status: 'active', until: '2026-11-03T09:30:00.000Z', paidUntil: null } };
      sub.pricing.currentPeriod.periodStart = TRIAL_END;
    });
    const c = await card();
    expect(c.textContent).toContain(`When it ends, on 20 October 2026 at 10:30 (${CASABLANCA}), the access granted to your business starts at once.`);
    expect(c.textContent).not.toContain(en['trial.terms.after']);
    const period = (await screen.findByRole('heading', { name: 'Current period' })).closest('.card')!;
    expect(period.textContent).toContain(`Access granted by the platform starts when the free trial ends, on 20 October 2026 at 10:30 (${CASABLANCA}).`);
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

  it('in Arabic the card reads right to left, the button names the trial in Arabic, and each date and address is isolated', async () => {
    localStorage.setItem('erp.web.language', 'ar');
    const setup = trialSetup({ sentTo: ['email', 'whatsapp'], destinations: [{ channel: 'email', masked: 'o•••@example.test' }, { channel: 'whatsapp', masked: '+222••••1234' }] });
    account('trial_available', trialStatus({ setup }));
    const c = (await screen.findByRole('heading', { name: ar['trial.title'], level: 2 })).closest('section')!;
    expect(document.documentElement.dir).toBe('rtl');
    expect(within(c).getByRole('button', { name: ar['trial.claim'] })).toBeTruthy();
    const dates = [...c.querySelectorAll('bdi')].map((b) => b.textContent ?? '');
    expect(dates.some((d) => d.includes(zoneName(TRIAL_ZONE, 'ar-MR')))).toBe(true);
    // Each address is kept left to right on its own; the list joining them flows with the Arabic sentence — never
    // inside one <bdi>, where the first address would turn the Arabic "and" around.
    const addresses = [...c.querySelectorAll('.ltr')];
    expect(addresses.map((e) => e.textContent)).toEqual(['o•••@example.test', '+222••••1234']);
    expect(addresses.map((e) => e.closest('bdi'))).toEqual([null, null]);
    expect(addresses[0]!.parentElement!.textContent).toContain('o•••@example.test و+222••••1234');
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

  it('in French: each kind in words, the trial’s sentences with its recorded dates in Casablanca time, and no server note or UTC instant', async () => {
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

  it('in Arabic each date of the trial’s sentence is isolated, so it keeps its own order', async () => {
    localStorage.setItem('erp.web.language', 'ar');
    expiredAccount();
    const history = (await screen.findByRole('heading', { name: ar['account.timeline'], level: 2 })).closest('section')!;
    const dates = [...history.querySelectorAll('bdi')].map((b) => b.textContent ?? '');
    expect(dates.filter((d) => d.includes(zoneName(TRIAL_ZONE, 'ar-MR')))).toHaveLength(3);
    expect(history.textContent).toContain(ar['event.trial_claimed']);
    expect(history.textContent).not.toContain('_');
  });

  it('every kind the server records has its own words in each language — no code, no kind left to a guess', async () => {
    const kinds = [
      'created', 'extended', 'branches_changed', 'seats_changed', 'complimentary_granted', 'complimentary_revoked', 'backfilled', 'registered',
      'administrative_grant', 'suspended', 'reinstated', 'cancelled', 'approved', 'rejected', 'period_corrected', 'seat_requested', 'seat_paid',
      'staff_activated', 'seat_closed', 'store_requested', 'activity_requested', 'activity_changed', 'activity_scheduled', 'renewed',
      'trial_eligible', 'trial_claimed', 'trial_expired',
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
      await ownerLogout();
      cleanup();
    }
  });
});

describe('Apply ends signed in', () => {
  it('keeps the session the confirmation opens and leads to the account, where the eligible Owner sees the trial — Apply claims nothing', async () => {
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
            verification: { destination: 'o•••@example.test', channel: 'email' },
            continuation: { token: 'continuation-for-tests', expiresAt: '2026-10-13T10:00:00.000Z', expiresInSeconds: 900 },
            next: 'verify_contact',
            trialEligible: true,
          },
        };
      }
      if (url.endsWith('/platform/register/verify/confirm')) return { body: { accessToken: 'new-owner-session', refreshToken: 'refresh-for-tests', expiresIn: 900 } };
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
    await user.type(screen.getByLabelText(/Email address/), 'owner@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
    await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    await user.type(await screen.findByLabelText('Verification code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText(en['apply.done.trial'])).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Open my business account' }));
    expect(await card()).toBeTruthy();
    // Signed in with the session the confirmation opened: no sign-in form, no password asked again.
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    const reads = sent.filter((r) => r.url.endsWith('/platform/my-subscription'));
    expect(reads.map((r) => r.authorization)).toContain('Bearer new-owner-session');
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
    await user.type(screen.getByLabelText(/Email address/), 'owner@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
    await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['apply.done.body'])).toBeTruthy();
    expect(screen.queryByText(en['apply.done.trial'])).toBeNull();
  });
});
