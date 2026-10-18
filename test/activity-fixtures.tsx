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

export { B1, B2, B3, BOTH, PLAN_V3, line, quoteOf, subscription, BRANCHES, LINES, activityOptions, allocation } from './fixtures-data';
import { B1, B2, B3, BOTH, PLAN_V3, line, quoteOf, subscription, BRANCHES, LINES, activityOptions, allocation, NO_TRIAL, PORTAL_SESSION } from './fixtures-data';

/**
 * A route's answer: a status and a JSON body, or a whole Response for what JSON cannot say — a body cut off on its way.
 */
export type Handler = (url: string, body: unknown) => { status?: number; body: unknown } | Response | undefined;

/**
 * A wait for what a busy machine shows slowly — a file's first render, an answer after a form typed key by key: five
 * seconds rather than Testing Library's one. At one second such waits failed while a build ran beside the tests.
 */
export const SLOW_WAIT = { timeout: 5_000 };

/**
 * The API's rate limit refusing a request, as its exception filter answers: no code, and the limiter's class name for
 * a sentence (@nestjs/throttler's own message).
 */
export const THROTTLED = { status: 429, body: { statusCode: 429, error: 'TOO_MANY_REQUESTS', message: 'ThrottlerException: Too Many Requests' } };

/**
 * A fetch that answers by route and remembers every body it was sent, with the credentials it carried: a bearer (the
 * portal never sends one) and the portal session's CSRF token.
 */
export function serve(handler: Handler) {
  const sent: { url: string; method: string; body: unknown; authorization: string | null; csrf: string | null }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const headers = new Headers(init?.headers);
    sent.push({ url, method: init?.method ?? 'GET', body, authorization: headers.get('Authorization'), csrf: headers.get('x-csrf-token') });
    const answer = handler(url, body);
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
    if (answer instanceof Response) return answer;
    if (answer) return json(answer.body, answer.status ?? 200);
    if (url.endsWith('/platform/admin/me')) return json({ message: 'Unauthorized' }, 401);
    // The Owner's portal session (0099): signed in unless a test answers otherwise; a refresh finds nothing to renew.
    if (url.endsWith('/platform/portal/session')) return json(PORTAL_SESSION);
    if (url.endsWith('/platform/portal/refresh')) return json({ statusCode: 401, message: 'Invalid or expired session' }, 401);
    if (url.endsWith('/platform/portal/sign-out')) return new Response(null, { status: 204 });
    // The portal's status panel and the payment instructions: an API that has neither, unless a test answers them.
    if (url.endsWith('/platform/my-subscription/status')) return json({ message: 'Not Found' }, 404);
    if (url.endsWith('/platform/payment-instructions')) return json({ available: false, providers: [], defaultProvider: null, placeholder: false });
    // The account page's free-trial card (2026-10-13): a business with no trial, so no card, unless a test answers otherwise.
    if (url.endsWith('/platform/my-subscription/trial')) return json(NO_TRIAL);
    // The step-up every administrator decision takes first (0094): accepted unless a test answers otherwise.
    if (url.endsWith('/platform/admin/step-up')) return json({ expiresAt: '2026-10-12T10:05:00.000Z' });
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
