import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A portal build as an Owner meets it (`VITE_SITE_SURFACE=portal`, docs/101): https://dukan.tsxmr.com, the company
 * site's pages replaced by the stub the build aliases them to (`vite.config.ts`). Its legal and support links lead to
 * the company site, https://tsxmr.com, in the reader's language.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return {
    ...real,
    SITE: Object.freeze({ ...real.SITE, siteSurface: 'portal', portalOrigin: 'https://dukan.tsxmr.com', publicSiteOrigin: 'https://tsxmr.com' }),
    SURFACE: 'portal',
  };
});
vi.mock('../src/public-areas', () => import('../src/public-areas.portal'));

const { App } = await import('../src/app');
const { I18nProvider } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { en } = await import('../src/i18n/en');
const { fr } = await import('../src/i18n/fr');
const { ar } = await import('../src/i18n/ar');
const CATALOGUE = { en, fr, ar } as const;

const requests: string[] = [];

/** Where the router is, rendered beside the page, so a redirect can be read. */
function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function mount(path: string) {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
          <Where />
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
      // Signed out: no portal session, and none to refresh.
      return new Response(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a portal build, address by address', () => {
  it('its root is the Owner’s page: sent to /subscription, where the Owner signs in', async () => {
    mount('/');
    expect(await screen.findByRole('heading', { name: en['portal.title'], level: 1 })).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/subscription');
    expect(screen.getByLabelText(en['account.identifier'])).toBeTruthy();
    // It asked who is signed in — the session, then one refresh — and nothing else.
    expect(requests.map((r) => r.replace(/^.*\/api\/v1\//, ''))).toEqual(['platform/portal/session', 'platform/portal/refresh']);
  });

  it('the Owner page’s old address leads to it too', async () => {
    mount('/account/trial');
    expect(await screen.findByRole('heading', { name: en['portal.title'], level: 1 })).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/subscription');
  });

  for (const path of ['/about', '/privacy', '/fr/terms', '/ar', '/in-app/privacy', '/apply', '/login', '/products/dukan-erp']) {
    it(`${path} is the portal’s own "Page not found" — none of the company site’s pages is here`, async () => {
      mount(path);
      expect(await screen.findByRole('heading', { name: en['notFound.title'], level: 1 })).toBeTruthy();
      expect(screen.getByText(en['portal.notFound.body'])).toBeTruthy();
      expect(screen.getByRole('link', { name: en['portal.notFound.home'] }).getAttribute('href')).toBe('/subscription');
      // No company-site navigation, no form, no request.
      expect(document.querySelector('nav[aria-label="Main navigation"]')).toBeNull();
      expect(document.querySelector('form')).toBeNull();
      expect(requests).toEqual([]);
    });
  }

  for (const lang of ['en', 'fr', 'ar'] as const) {
    it(`in ${lang}: the legal and support pages are the company site’s, in the reader’s language; the page reads ${lang === 'ar' ? 'right to left' : 'left to right'}`, async () => {
      localStorage.setItem('erp.web.language', lang);
      mount('/subscription');
      const cat = CATALOGUE[lang];
      expect(await screen.findByRole('heading', { name: cat['portal.title'], level: 1 })).toBeTruthy();
      const prefix = lang === 'en' ? '' : `/${lang}`;
      const footer = document.querySelector('footer.chrome-footer') as HTMLElement;
      const links = within(footer).getAllByRole('link').map((a) => a.getAttribute('href'));
      for (const path of ['/support', '/privacy', '/privacy-choices', '/terms', '/account-deletion', '/security', '/legal']) {
        expect(links).toContain(`https://tsxmr.com${prefix}${path}`);
      }
      expect(links.every((h) => h!.startsWith('https://tsxmr.com/') || h === `https://tsxmr.com${prefix}`)).toBe(true);
      expect(footer.textContent).toContain(cat['portal.footer.operator'].replace('{name}', 'TSX-MR'));
      expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      // The product's own mark leads back to the Owner's page; never "portal.tsxmr.com" anywhere.
      expect(screen.getByRole('link', { name: cat['portal.home'] }).getAttribute('href')).toBe('/subscription');
      expect(document.body.innerHTML).not.toContain('portal.tsxmr.com');
    });
  }
});
