import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A portal build as an Owner meets it (`VITE_SITE_SURFACE=portal`, docs/101): https://dukan.tsxmr.com, the company
 * site's pages replaced by the stub the build aliases them to (`vite.config.ts`). Its legal and support pages are its
 * own (owner, 2026-11-05): the approved Dukan ERP texts at /in-app/<page>, in the reader's language — never a link to
 * the company site's pre-launch texts.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return {
    ...real,
    SITE: Object.freeze({ ...real.SITE, siteSurface: 'portal', portalOrigin: 'https://dukan.tsxmr.com', publicSiteOrigin: 'https://tsxmr.com', legalEffectiveDate: '2026-11-04', deletionChannel: 'email-assisted' }),
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
const LEGAL_PATHS = ['/support', '/privacy', '/privacy-choices', '/terms', '/account-deletion', '/security', '/legal'];
const VERSIONS: Record<string, string> = { '/privacy': '1.1', '/account-deletion': '1.1', '/privacy-choices': '1.0', '/terms': '1.0', '/security': '1.0', '/legal': '1.0' };

/** Never a link, canonical or alternate back to the company site's pre-launch texts (owner, 2026-11-05); never /admin. */
function expectNoPrelaunchLink() {
  const prelaunch = /^https?:\/\/(www\.)?tsxmr\.com(\/(fr|ar))?\/(privacy|privacy-choices|terms|account-deletion|security|legal|support)\b/;
  const hrefs = [...document.querySelectorAll('a[href], link[href]')].map((e) => e.getAttribute('href') ?? '');
  expect(hrefs.filter((h) => prelaunch.test(h))).toEqual([]);
  expect(document.querySelector('meta[property="og:url"][content*="//tsxmr.com"]')).toBeNull();
  expect(hrefs.some((h) => h.startsWith('/admin'))).toBe(false);
}

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

  for (const path of ['/about', '/privacy', '/fr/terms', '/ar', '/apply', '/login', '/products/dukan-erp']) {
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
    it(`in ${lang}: the legal and support pages are the portal’s own, in the reader’s language; the page reads ${lang === 'ar' ? 'right to left' : 'left to right'}`, async () => {
      localStorage.setItem('erp.web.language', lang);
      mount('/subscription');
      const cat = CATALOGUE[lang];
      expect(await screen.findByRole('heading', { name: cat['portal.title'], level: 1 })).toBeTruthy();
      const prefix = lang === 'en' ? '' : `/${lang}`;
      const footer = document.querySelector('footer.chrome-footer') as HTMLElement;
      const links = within(footer).getAllByRole('link').map((a) => a.getAttribute('href'));
      for (const path of LEGAL_PATHS) expect(links).toContain(`${prefix}/in-app${path}`);
      expect(links.filter((h) => /^https?:/.test(h!))).toEqual([]);
      expectNoPrelaunchLink();
      expect(footer.textContent).toContain(cat['portal.footer.operator'].replace('{name}', 'TSXMR'));
      expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      // The product's own mark leads back to the Owner's page; never "portal.tsxmr.com" anywhere.
      expect(screen.getByRole('link', { name: cat['portal.home'] }).getAttribute('href')).toBe('/subscription');
      expect(document.body.innerHTML).not.toContain('portal.tsxmr.com');
    });
  }
});

describe('a portal build’s own legal and support pages (owner, 2026-11-05)', () => {
  for (const lang of ['en', 'fr', 'ar'] as const) {
    const prefix = lang === 'en' ? '' : `/${lang}`;
    for (const path of LEGAL_PATHS) {
      it(`${prefix}/in-app${path} opens directly, in ${lang}, approved${VERSIONS[path] ? ` version ${VERSIONS[path]}` : ''}, linking only among themselves`, async () => {
        mount(`${prefix}/in-app${path}`);
        expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByTestId('where').textContent).toBe(`${prefix}/in-app${path}`);
        expect(document.documentElement.lang).toBe(lang);
        expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
        expect(screen.queryByText(CATALOGUE[lang]['notFound.title'])).toBeNull();
        if (VERSIONS[path]) {
          expect(document.body.textContent).toContain(` ${VERSIONS[path]} · `);
          expect(document.body.textContent).toMatch(/2026/);
          expect(document.body.textContent).not.toContain(CATALOGUE[lang]['legal.effectivePending']);
        }
        expect(document.querySelectorAll('mark.pending')).toHaveLength(0);
        // Every link stays on this origin, among these pages.
        const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!).filter((h) => !h.startsWith('#') && !h.startsWith('mailto:'));
        expect(hrefs.filter((h) => !/^(\/(fr|ar))?\/in-app\//.test(h))).toEqual([]);
        expectNoPrelaunchLink();
        expect(requests).toEqual([]);
      });
    }
  }

  it('switching language keeps the page, and the reader on the portal', async () => {
    mount('/in-app/privacy');
    await screen.findAllByRole('heading', { level: 1 });
    const switcher = document.querySelector('ul.languages-app') as HTMLElement;
    const links = within(switcher).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/in-app/privacy', '/fr/in-app/privacy', '/ar/in-app/privacy']);
    fireEvent.click(links[2]!);
    expect(await screen.findByText('/ar/in-app/privacy', { selector: 'output' })).toBeTruthy();
    await screen.findAllByRole('heading', { level: 1 });
    expect(document.documentElement.dir).toBe('rtl');
    expectNoPrelaunchLink();
  });
});
