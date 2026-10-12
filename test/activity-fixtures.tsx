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
import { B1, B2, B3, BOTH, PLAN_V3, line, quoteOf, subscription, BRANCHES, LINES, activityOptions, allocation } from './fixtures-data';

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
