import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { LANGUAGES } from '../src/i18n/languages';
import { ThemeProvider } from '../src/theme/theme';
import { pathOf, PUBLIC_ROUTES } from '../src/site/routes';

/**
 * Every public page in every language (docs/74 §2, §9): it renders, says what it is in one `h1`, sets the document's
 * language and direction, links its policies, never links the administration area, and shows no catalogue key.
 */
const PLAN = { version: 3, branchMonthly: 500, agentMonthly: 300, bothMonthly: 700, includedSeatsPerStore: 1, extraSeatMonthly: 100, currency: 'MRU', effectiveFrom: '2026-10-05T00:00:00.000Z', upcoming: null };
const KEYS = Object.keys(en);

function mount(path: string) {
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

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/platform/plan')) return json(PLAN);
      return json({ message: 'Unauthorized' }, 401);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('every public page in every language', () => {
  for (const lang of LANGUAGES) {
    for (const route of PUBLIC_ROUTES) {
      const path = pathOf(route.id, lang);
      it(`${path} renders in ${lang}`, async () => {
        mount(path);
        const h1 = await screen.findAllByRole('heading', { level: 1 });
        expect(h1).toHaveLength(1);
        expect(document.documentElement.lang).toBe(lang);
        expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
        // A skip link first, to a main landmark.
        const skip = document.querySelector('a.skip-link') as HTMLAnchorElement;
        expect(skip.getAttribute('href')).toBe('#main');
        expect(document.getElementById('main')?.tagName).toBe('MAIN');
        // The footer links the policies, in this language — and not account deletion, a Dukan ERP document (2026-10-19).
        const footer = document.querySelector('footer')!;
        for (const id of ['privacy', 'terms', 'support'] as const) {
          expect(within(footer).getAllByRole('link').some((a) => a.getAttribute('href') === pathOf(id, lang))).toBe(true);
        }
        expect(within(footer).getAllByRole('link').some((a) => a.getAttribute('href') === pathOf('accountDeletion', lang))).toBe(false);
        // Never a link to the administration area from a public page.
        expect([...document.querySelectorAll('a')].some((a) => (a.getAttribute('href') ?? '').startsWith('/admin'))).toBe(false);
        // No catalogue key ever shows as text.
        const text = document.body.textContent ?? '';
        expect(KEYS.filter((k) => text.includes(k) && /\./.test(k) && !/^\d/.test(k))).toEqual([]);
      });
    }
  }
});

describe('the legal pages', () => {
  it('name their version and effective date, and show every pending decision visibly in a preview', async () => {
    mount('/privacy');
    expect(await screen.findByText(/Version 1\.0 \(draft\)/)).toBeTruthy();
    expect(screen.getByText('Effective date not set')).toBeTruthy();
    const pending = [...document.querySelectorAll('mark.pending[data-blocker]')].map((m) => m.getAttribute('data-blocker'));
    expect(pending).toContain('retention_period');
    expect(pending).toContain('processors');
  });

  it('the deletion page names no channel while none is configured', async () => {
    mount('/account-deletion');
    await screen.findAllByRole('heading', { level: 1 });
    expect(document.querySelector('mark.pending[data-input="deletionChannelName"]')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/WhatsApp number/);
  });

  it('an address that is no page says so, with a way home', async () => {
    mount('/ar/no-such-page');
    expect(await screen.findByText('الصفحة غير موجودة')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'العودة إلى الصفحة الرئيسية' }).getAttribute('href')).toBe('/ar');
  });
});

describe('the boundary between public and protected', () => {
  it('a protected page says noindex and shows its sign-in', async () => {
    mount('/account');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('the preview banner says the build is not for publication', async () => {
    mount('/');
    expect(await screen.findByRole('note')).toBeTruthy();
  });
});
