import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A public build as a visitor sees it (`VITE_SITE_SURFACE=public`, docs/95): the build's inputs say `public` and the
 * protected areas are the stub the build aliases them to (`vite.config.ts`). No portal origin is given, as today.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return { ...real, SITE: Object.freeze({ ...real.SITE, siteSurface: 'public', portalOrigin: '' }), SURFACE: 'public' };
});
vi.mock('../src/protected-areas', () => import('../src/protected-areas.public'));

const { App } = await import('../src/app');
const { I18nProvider } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { en } = await import('../src/i18n/en');
const { LANGUAGES } = await import('../src/i18n/languages');
const { pathOf } = await import('../src/site/routes');
const { fr } = await import('../src/i18n/fr');
const { ar } = await import('../src/i18n/ar');
const CATALOGUE = { en, fr, ar } as const;

const requests: string[] = [];

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
  requests.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response('{}', { status: 500 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const hrefs = () => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');

describe('a public build, page by page', () => {
  for (const lang of LANGUAGES) {
    it(`the Dukan ERP page in ${lang}: no prices, no application or sign-in, a way to contact, and no request to any API`, async () => {
      mount(pathOf('dukanErp', lang));
      await screen.findAllByRole('heading', { level: 1 });
      const links = hrefs();
      for (const id of ['apply', 'login', 'applicationStatus'] as const) expect(links).not.toContain(pathOf(id, lang));
      // The protected areas themselves (`/account-deletion` is a public page and stays linked).
      expect(links.filter((h) => /^(\/(fr|ar))?\/(account|admin)(\/|$)/.test(h))).toEqual([]);
      expect(links).toContain(pathOf('contact', lang));
      expect(screen.queryByText(en['home.pricing.loading'])).toBeNull();
      // Coming soon, said plainly; no subscription section.
      expect(screen.getByText(CATALOGUE[lang]['prelaunch.badge'])).toBeTruthy();
      expect(document.getElementById('subscription-h')).toBeNull();
      expect(document.body.textContent).not.toMatch(/MRU|7-day|essai gratuit|تجربة مجانية/);
      expect(requests).toEqual([]);
    });

    it(`the home page in ${lang}: no application or sign-in link, the legal pages in the footer`, async () => {
      mount(pathOf('home', lang));
      await screen.findAllByRole('heading', { level: 1 });
      const links = hrefs();
      for (const id of ['apply', 'login', 'applicationStatus'] as const) expect(links).not.toContain(pathOf(id, lang));
      for (const id of ['privacy', 'terms', 'support', 'accountDeletion', 'privacyChoices', 'legalNotice', 'security'] as const) expect(links).toContain(pathOf(id, lang));
      expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    });
  }

  for (const path of ['/apply', '/login', '/application-status', '/account', '/account/trial', '/admin', '/admin/businesses', '/fr/apply']) {
    it(`${path} is an unknown page here, never a form or a console`, async () => {
      mount(path);
      await screen.findAllByRole('heading', { level: 1 });
      expect(document.querySelector('form')).toBeNull();
      expect(screen.queryByLabelText(/password|mot de passe/i)).toBeNull();
      expect(requests).toEqual([]);
    });
  }
});
