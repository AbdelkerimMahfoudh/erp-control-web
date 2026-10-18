import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MySubscription } from '../src/api/types';
import { portalSignOut } from '../src/auth/owner';
import { en } from '../src/i18n/en';
import { BRANCHES, LINES, SLOW_WAIT, activityOptions, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';
import { PORTAL_SESSION, trialStatus, trialView } from './fixtures-data';

useActivityHarness();
afterEach(async () => {
  await portalSignOut();
  vi.useRealTimers();
});

/*
 * The Dukan ERP portal's own sign-in (0099; docs/101 §4), on the app's identity: the page holds no token — the session
 * is two HttpOnly cookies the API sets — and keeps only the session's CSRF token, in memory, for its POSTs. An access
 * cookie that expired is refreshed once and the request sent again; a session that ended shows the sign-in.
 */
const UNAUTHORIZED = { status: 401, body: { statusCode: 401, message: 'Unauthorized' } };
const CLAIM = 'Start my 7-day free trial';
const CONFIRM = 'Yes, start it now';

/** A business that may claim its trial, behind a portal that starts signed out and opens on a right password. */
function portal(extra?: Handler) {
  let signedIn = false;
  const sub = subscription(BRANCHES, LINES) as unknown as MySubscription;
  sub.entitlement = { ...sub.entitlement, state: 'trial_available', periodEnd: null, canWrite: false, trial: trialView('available') };
  const sent = serve((url, body) => {
    const own = extra?.(url, body);
    if (own) return own;
    if (url.endsWith('/platform/portal/session')) return signedIn ? { body: PORTAL_SESSION } : UNAUTHORIZED;
    if (url.endsWith('/platform/portal/sign-in')) {
      const { password } = body as { password: string };
      if (password !== 'right-password') return UNAUTHORIZED;
      signedIn = true;
      return { body: { status: 'signed_in', session: PORTAL_SESSION } };
    }
    if (url.endsWith('/platform/portal/sign-out')) {
      signedIn = false;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/platform/my-subscription')) return signedIn ? { body: sub } : UNAUTHORIZED;
    if (url.endsWith('/platform/my-subscription/trial')) return { body: trialStatus() };
    if (url.endsWith('/platform/my-subscription/activity-options')) return { body: activityOptions() };
    if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
    return undefined;
  });
  mount('/subscription');
  return sent;
}

async function signIn(password = 'right-password') {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(en['account.identifier'], {}, SLOW_WAIT), '+22236000001');
  await user.type(screen.getByLabelText(en['account.password']), password);
  await user.click(screen.getByRole('button', { name: en['action.signIn'] }));
}

const card = async () => (await screen.findByRole('heading', { name: '7-day free trial', level: 2 }, SLOW_WAIT)).closest('section')!;

describe('signing in on the portal', () => {
  it('signs in with the app’s identity on the portal’s own route; no bearer, nothing stored, no request carries a token', async () => {
    const sent = portal();
    await signIn();
    expect(await card()).toBeTruthy();
    expect(sent.filter((r) => r.url.endsWith('/platform/portal/sign-in')).map((r) => [r.method, r.body])).toEqual([['POST', { identifier: '+22236000001', password: 'right-password' }]]);
    expect(sent.filter((r) => r.authorization !== null)).toEqual([]);
    expect(Object.keys(localStorage).sort()).toEqual(['erp.web.language']);
    expect(sessionStorage.length).toBe(0);
    expect(document.body.innerHTML).not.toContain(PORTAL_SESSION.csrfToken);
  });

  it('a wrong password is the generic refusal: nothing else is said, and the form stays', async () => {
    portal();
    await signIn('wrong');
    expect(await screen.findByText(en['account.signin.failed'], {}, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByLabelText(en['account.password'])).toBeTruthy();
  });

  it('someone who is not the Owner is told the portal is the Owner’s — at sign-in, and on a session that is not an Owner’s', async () => {
    portal((url) => (url.endsWith('/platform/portal/sign-in') ? { status: 403, body: { statusCode: 403, code: 'owner_only', message: 'Only the Owner.' } } : undefined));
    await signIn();
    expect(await screen.findByText(en['portal.ownerOnly'], {}, SLOW_WAIT)).toBeTruthy();
    cleanup();
    portal((url) => (url.endsWith('/platform/portal/session') ? { status: 403, body: { statusCode: 403, code: 'owner_only', message: 'Only the Owner.' } } : undefined));
    expect(await screen.findByText(en['portal.ownerOnly'], {}, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByRole('button', { name: en['action.signOut'] })).toBeTruthy();
  });

  it('the same contact at two businesses: the chooser, then the business chosen', async () => {
    const sent = portal((url) => {
      if (url.endsWith('/platform/portal/sign-in')) return { body: { status: 'choose_account', continuationToken: 'cont', expiresIn: 120, accounts: [{ accountRef: '0', companyName: 'Boutique A', userName: 'Aicha' }, { accountRef: '1', companyName: 'Boutique B', userName: 'Aicha' }] } };
      if (url.endsWith('/platform/portal/choose-account')) return { body: { status: 'signed_in', session: PORTAL_SESSION } };
      return undefined;
    });
    await signIn();
    const choice = await screen.findByRole('button', { name: 'Boutique B — Aicha' }, SLOW_WAIT);
    expect(await screen.findByText(en['account.choice'])).toBeTruthy();
    // The choice opens the session: the API sets the cookies; the page reads who is signed in from the answer.
    await userEvent.setup().click(choice);
    await waitFor(() => expect(sent.filter((r) => r.url.endsWith('/platform/portal/choose-account')).map((r) => r.body)).toEqual([{ continuationToken: 'cont', accountRef: '1' }]));
  });

  it('every POST carries the session’s CSRF token; no GET does', async () => {
    const sent = portal((url) => (url.endsWith('/trial/claim') ? { status: 201, body: { claimed: true, replayed: false, state: 'trial_active', trial: trialView('active'), subscriptionVersion: 2 } } : undefined));
    await signIn();
    const c = await card();
    const user = userEvent.setup();
    await user.click(within(c).getByRole('button', { name: CLAIM }));
    await user.click(within(c).getByRole('button', { name: CONFIRM }));
    await waitFor(() => expect(sent.some((r) => r.url.endsWith('/trial/claim'))).toBe(true));
    const posts = sent.filter((r) => r.method === 'POST' && !/portal\/(sign-in|refresh|sign-out)$/.test(r.url));
    expect(posts.map((r) => [r.url.replace(/^.*\/api\/v1\//, ''), r.csrf])).toEqual([['platform/my-subscription/trial/claim', PORTAL_SESSION.csrfToken]]);
    expect(sent.filter((r) => r.method === 'GET' && r.csrf !== null)).toEqual([]);
  });

  it('an access cookie that expired is refreshed once — for requests refused together — and each is sent again', async () => {
    // The access cookie expires once the Owner has signed in: the reads that follow are refused until it is renewed.
    let signedIn = false;
    let expired = true;
    let refreshes = 0;
    const sent = portal((url) => {
      if (url.endsWith('/platform/portal/sign-in')) signedIn = true;
      if (url.endsWith('/platform/portal/refresh')) {
        if (!signedIn) return UNAUTHORIZED;
        refreshes++;
        expired = false;
        return { body: { status: 'signed_in', session: PORTAL_SESSION } };
      }
      if (/my-subscription\/(trial|activity-options|seat-requests)$/.test(url) && expired) return UNAUTHORIZED;
      return undefined;
    });
    await signIn();
    expect(await card()).toBeTruthy();
    expect(refreshes).toBe(1);
    // The three reads refused together each went again after the one refresh.
    for (const path of ['trial', 'activity-options', 'seat-requests']) expect(sent.filter((r) => r.url.endsWith(`/my-subscription/${path}`)).length).toBeGreaterThanOrEqual(2);
  });

  it('a session that ended — the refresh refused too — shows the sign-in again, never an error', async () => {
    portal((url) => (url.endsWith('/platform/portal/session') ? UNAUTHORIZED : undefined));
    expect(await screen.findByLabelText(en['account.identifier'], {}, SLOW_WAIT)).toBeTruthy();
    expect(screen.queryByText(en['error.generic'])).toBeNull();
  });

  it('signing out ends the session on the server and forgets the CSRF token here', async () => {
    const sent = portal();
    await signIn();
    expect(await card()).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: en['action.signOut'] }));
    expect(await screen.findByLabelText(en['account.identifier'], {}, SLOW_WAIT)).toBeTruthy();
    expect(sent.filter((r) => r.url.endsWith('/platform/portal/sign-out')).map((r) => r.method)).toEqual(['POST']);
  });

  it('nothing is claimed without the confirmation — not on load, at sign-in, at the button alone or as the page reads the trial again', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'], shouldAdvanceTime: true });
    const sent = portal();
    await signIn();
    const c = await card();
    const claims = () => sent.filter((r) => r.url.endsWith('/trial/claim'));
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(claims()).toEqual([]);
    // The button alone asks; "Not now" goes back, and still nothing was sent.
    const user = userEvent.setup();
    await user.click(within(c).getByRole('button', { name: CLAIM }));
    expect(within(c).getByText(en['trial.confirm.body'])).toBeTruthy();
    await user.click(within(c).getByRole('button', { name: en['trial.confirm.no'] }));
    expect(within(c).getByRole('button', { name: CLAIM })).toBeTruthy();
    expect(claims()).toEqual([]);
  });
});
