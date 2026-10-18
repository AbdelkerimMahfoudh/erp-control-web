import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { GraceView, NoticeTimeline, PortalStatus } from '../src/api/types';
import { portalSignOut } from '../src/auth/owner';
import { ar } from '../src/i18n/ar';
import { en, type Catalogue } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { BRANCHES, LINES, SLOW_WAIT, activityOptions, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';
import { NO_TRIAL, TRIAL_ZONE, portalStatus, zoneName } from './fixtures-data';

useActivityHarness();
afterEach(async () => {
  await portalSignOut();
});

/*
 * What the portal shows above everything (GET platform/my-subscription/status; 0099, docs/101 §3–§6): the access the
 * business has, in colour and words; the paid period; the grace and the allowance of three in any 12 months; how a
 * renewal made now counts; where the subscription messages stand. Every part is the server's — the page works none of
 * it out. The business's zone is Africa/Lagos (GMT+1).
 */
const at = (iso: string, locale = 'en-GB') =>
  `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: TRIAL_ZONE }).format(new Date(iso))} (${zoneName(TRIAL_ZONE, locale, iso)})`;

function portal(status: PortalStatus, extra?: Handler) {
  const sent = serve((url, body) => {
    const own = extra?.(url, body);
    if (own) return own;
    if (url.endsWith('/platform/my-subscription')) return { body: subscription(BRANCHES, LINES) };
    if (url.endsWith('/platform/my-subscription/status')) return { body: status };
    if (url.endsWith('/platform/my-subscription/trial')) return { body: NO_TRIAL };
    if (url.endsWith('/platform/my-subscription/activity-options')) return { body: activityOptions() };
    if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
    return undefined;
  });
  mount('/subscription');
  return sent;
}

const panel = async (cat: Catalogue = en) => (await screen.findByRole('heading', { name: cat['portal.status.title'], level: 2 }, SLOW_WAIT)).closest('section')!;
const grace = (over: Partial<GraceView>): GraceView => ({ ...portalStatus().grace, ...over });

describe('the access, in colour and words', () => {
  for (const [access, tone] of [
    ['operational', 'ok'],
    ['read_only', 'warn'],
    ['stopped', 'danger'],
  ] as const) {
    it(`${access}: its badge and what it means`, async () => {
      portal(portalStatus({ access }));
      const p = await panel();
      const badge = within(p).getByText(en[`portal.access.${access}`]);
      expect(badge.className).toBe(`badge tone-${tone}`);
      expect(p.textContent).toContain(en[`portal.access.${access}.explain`]);
    });
  }

  it('the paid period, its start and end in the business’s zone', async () => {
    portal(portalStatus());
    const p = await panel();
    expect(p.textContent).toContain(`Paid period: from ${at('2026-10-01T09:30:00.000Z')} to ${at('2026-11-01T09:30:00.000Z')}.`);
  });
});

describe('the grace, as the server decided it', () => {
  it('running: its exact end and the hours left, and the renewal counts from the original end', async () => {
    portal(portalStatus({ state: 'grace', grace: grace({ status: 'active', startedAt: '2026-11-01T09:30:00.000Z', endsAt: '2026-11-04T09:30:00.000Z', hoursRemaining: 31, availableAtPeriodEnd: null }) }));
    const p = await panel();
    expect(p.textContent).toContain(`Grace period: the app keeps working until ${at('2026-11-04T09:30:00.000Z')} — 31 hours left.`);
    expect(p.textContent).toContain(`A renewal confirmed during the grace period counts from ${at('2026-11-01T09:30:00.000Z')}, when the paid period ended`);
    expect(p.textContent).toContain('Grace periods left: 2 of 3 in any 12 months, 72 hours each.');
  });

  it('ended, or none available this time: said — the business used its three of the last 12 months', async () => {
    portal(portalStatus({ access: 'read_only', state: 'expired', grace: grace({ status: 'ended', startedAt: '2026-11-01T09:30:00.000Z', endsAt: '2026-11-04T09:30:00.000Z', availableAtPeriodEnd: null }) }));
    expect((await panel()).textContent).toContain(`The grace period ended on ${at('2026-11-04T09:30:00.000Z')}.`);
    expect((await panel()).textContent).toContain(en['portal.renewal.after']);
    await portalSignOut();
    document.body.innerHTML = '';
    portal(portalStatus({ access: 'read_only', state: 'expired', grace: grace({ status: 'unavailable', startedAt: '2026-11-01T09:30:00.000Z', availableAtPeriodEnd: null, usesInWindow: 3, usesRemaining: 0 }) }));
    const p = await panel();
    expect(p.textContent).toContain('No grace period followed this paid period: this business has used its 3 grace periods of the last 12 months.');
    expect(p.textContent).toContain('Grace periods left: 0 of 3');
    expect(p.textContent).toContain(`Another one becomes available on ${at('2027-03-01T09:30:00.000Z')}.`);
  });

  it('ahead: whether the next period end opens a grace is the server’s answer, never a guess', async () => {
    portal(portalStatus());
    expect((await panel()).textContent).toContain('If this period ends before it is renewed, the app keeps working for 72 more hours (a grace period).');
    expect((await panel()).textContent).toContain(`A renewal confirmed before ${at('2026-11-01T09:30:00.000Z')} adds its month from`);
    await portalSignOut();
    document.body.innerHTML = '';
    portal(portalStatus({ grace: grace({ availableAtPeriodEnd: false, usesInWindow: 3, usesRemaining: 0 }) }));
    expect((await panel()).textContent).toContain('If this period ends before it is renewed, the app turns read-only at once: the 3 grace periods of the last 12 months are used.');
  });

  it('a business with no paid period yet: no grace line and no allowance — nothing to say about them', async () => {
    portal(portalStatus({ state: 'trial_active', period: { start: null, end: null }, notices: { next: null, last: null }, grace: grace({ availableAtPeriodEnd: null, usesInWindow: 0, usesRemaining: 3, nextUseRestoredAt: null }) }));
    const p = await panel();
    expect(p.textContent).not.toMatch(/grace/i);
    expect(p.textContent).not.toMatch(/renewal/i);
  });
});

describe('where the messages stand', () => {
  const sentBy = (over: Partial<NonNullable<NoticeTimeline['last']>>): NoticeTimeline['last'] => ({
    kind: 'paid_reminder',
    threshold: 'h72',
    state: 'accepted',
    channel: 'whatsapp',
    destination: '+222••••1234',
    fallbackReason: null,
    failureReason: null,
    at: '2026-10-29T09:31:00.000Z',
    ...over,
  });

  it('the next one due and the newest one: its kind and hours in words, its channel and masked destination, its state in colour and words', async () => {
    portal(portalStatus({ notices: { next: { kind: 'paid_reminder', threshold: 'h48', dueAt: '2026-10-30T09:30:00.000Z' }, last: sentBy({}) } }));
    const p = await panel();
    expect(p.textContent).toContain(`Next: renewal reminder, 48 hours before the paid period ends, on ${at('2026-10-30T09:30:00.000Z')}.`);
    expect(p.textContent).toContain(`Latest: renewal reminder, 72 hours before the paid period ends, ${at('2026-10-29T09:31:00.000Z')}.`);
    expect(within(p).getByText('sent').className).toBe('badge tone-ok');
    expect(p.textContent).toContain('by WhatsApp to +222••••1234');
    expect([...p.querySelectorAll('.ltr')].map((e) => e.textContent)).toEqual(['+222••••1234']);
    expect(p.textContent).toContain(en['portal.messages.whatsappFirst']);
  });

  it('by email for a recorded reason, and nothing sent with the reason why', async () => {
    portal(portalStatus({ notices: { next: null, last: sentBy({ channel: 'email', destination: 'o•••@example.test', fallbackReason: 'template_unavailable' }) } }));
    let p = await panel();
    expect(p.textContent).toContain('by email to o•••@example.test');
    expect(p.textContent).toContain(en['notice.fallback.template_unavailable']);
    await portalSignOut();
    document.body.innerHTML = '';
    portal(portalStatus({ notices: { next: null, last: sentBy({ kind: 'grace_ended', threshold: 'end', state: 'failed', channel: null, destination: null, failureReason: 'opted_out' }) } }));
    p = await panel();
    expect(p.textContent).toContain('Latest: grace period ended,');
    expect(within(p).getByText('not sent').className).toBe('badge tone-danger');
    expect(p.textContent).toContain(en['notice.failure.opted_out']);
  });

  it('in French and Arabic: the same facts in the reader’s words, each date and number isolated', async () => {
    for (const [lang, cat, locale] of [['fr', fr, 'fr-FR'], ['ar', ar, 'ar-MR']] as const) {
      localStorage.setItem('erp.web.language', lang);
      portal(portalStatus({ notices: { next: null, last: sentBy({}) } }));
      const p = await panel(cat);
      expect(p.textContent).toContain(cat['portal.access.operational']);
      expect(p.textContent).toContain(cat['notice.where.whatsapp'].replace('{destination}', '+222••••1234'));
      expect([...p.querySelectorAll('bdi')].some((b) => b.textContent!.includes(zoneName(TRIAL_ZONE, locale, '2026-10-29T09:31:00.000Z')))).toBe(true);
      expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      await portalSignOut();
      document.body.innerHTML = '';
    }
  });
});

describe('the Owner’s email address, verified on the portal', () => {
  const unverified = () => {
    const sub = subscription(BRANCHES, LINES) as unknown as { owner: { email: string; emailVerified: boolean } };
    sub.owner = { ...sub.owner, email: 'owner@example.test', emailVerified: false };
    return sub;
  };

  it('a code to the address on the account — never one typed here — then the code back; the address is verified', async () => {
    let verified = false;
    const sent = portal(portalStatus(), (url) => {
      if (url.endsWith('/platform/my-subscription')) {
        const sub = unverified();
        sub.owner.emailVerified = verified;
        return { body: sub };
      }
      if (url.endsWith('/contacts/email/verify/start')) return { body: { destination: 'o•••@example.test', delivery: 'sent' } };
      if (url.endsWith('/contacts/email/verify/confirm')) {
        verified = true;
        return { body: { emailVerified: true } };
      }
      return undefined;
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['portal.email.verify'] }, SLOW_WAIT));
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === 'A code was sent to o•••@example.test.')).toBeTruthy();
    await user.type(screen.getByLabelText(en['portal.email.code']), '123456');
    await user.click(screen.getByRole('button', { name: en['action.confirm'] }));
    await waitFor(() => expect(screen.queryByRole('button', { name: en['portal.email.verify'] })).toBeNull());
    const posts = sent.filter((r) => r.url.includes('/contacts/email/verify/'));
    expect(posts.map((r) => [r.url.replace(/^.*\/my-subscription\//, ''), r.body, r.csrf])).toEqual([
      ['contacts/email/verify/start', { language: 'en' }, 'csrf-for-tests'],
      ['contacts/email/verify/confirm', { code: '123456' }, 'csrf-for-tests'],
    ]);
  });

  it('a wrong or expired code is said in the page’s words; the form stays to try again', async () => {
    portal(portalStatus(), (url) => {
      if (url.endsWith('/platform/my-subscription')) return { body: unverified() };
      if (url.endsWith('/contacts/email/verify/start')) return { body: { destination: 'o•••@example.test', delivery: 'sent' } };
      if (url.endsWith('/contacts/email/verify/confirm')) return { status: 400, body: { statusCode: 400, code: 'invalid_code', message: 'server words' } };
      return undefined;
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['portal.email.verify'] }, SLOW_WAIT));
    await user.type(await screen.findByLabelText(en['portal.email.code']), '000000');
    await user.click(screen.getByRole('button', { name: en['action.confirm'] }));
    expect(await screen.findByText(en['portal.email.invalidCode'])).toBeTruthy();
    expect(document.body.textContent).not.toContain('server words');
    expect(screen.getByLabelText(en['portal.email.code'])).toBeTruthy();
  });
});

describe('how to pay, as the server says it', () => {
  const howTo = async () => (await screen.findByRole('heading', { name: en['account.payment.howto'], level: 2 }, SLOW_WAIT)).closest('section')!;

  it('nothing offered yet: the honest sentence, no provider, no code', async () => {
    portal(portalStatus());
    const s = await howTo();
    expect(within(s).getByText(en['account.payment.none'])).toBeTruthy();
    expect(within(s).queryByText(en['portal.pay.with'])).toBeNull();
  });

  it('once the platform offers a provider with its code: that provider and code, exactly as sent', async () => {
    portal(portalStatus(), (url) =>
      url.endsWith('/platform/payment-instructions') ? { body: { available: true, providers: [{ key: 'test', label: 'Test provider', code: 'TEST-CODE-1' }], defaultProvider: 'test' } } : undefined,
    );
    const s = await howTo();
    await waitFor(() => expect(within(s).getByText(en['portal.pay.with'])).toBeTruthy());
    expect(within(s).getByText('Test provider')).toBeTruthy();
    expect(within(s).getByText('TEST-CODE-1').className).toBe('ltr');
    expect(within(s).queryByText(en['account.payment.none'])).toBeNull();
  });
});

describe('help and the Owner’s data', () => {
  it('support, the privacy policy, the terms and account deletion, one tap away', async () => {
    portal(portalStatus());
    const help = (await screen.findByRole('heading', { name: en['portal.help.title'], level: 2 }, SLOW_WAIT)).closest('section')!;
    expect(within(help).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/support', '/privacy', '/terms', '/account-deletion']);
  });
});
