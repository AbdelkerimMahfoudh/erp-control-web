import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app';
import { DOCUMENTS, LEGAL_DOCUMENTS } from '../src/content';
import { textsOf } from '../src/content/types';
import { I18nProvider } from '../src/i18n';
import { headFor } from '../src/site/head';
import { headersFile, sitemapXml } from '../src/site/generated';
import { IN_APP_ROUTE_IDS, inAppPathOf, inAppRouteAt, pathOf, PUBLIC_ROUTES, type PublicRouteId } from '../src/site/routes';
import { ThemeProvider } from '../src/theme/theme';

/**
 * The public legal and support pages (the owner's brief of 2026-10-16, docs/85): each exists at its stable address in
 * three languages, needs no sign-in and no API, says who operates the service, is labelled a draft until TSX-MR approves
 * it, and links to every other one. Rendered through the real router, as a visitor arrives.
 */

const LEGAL: [PublicRouteId, string][] = [
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['support', '/support'],
  ['accountDeletion', '/account-deletion'],
  ['privacyChoices', '/privacy-choices'],
  ['legalNotice', '/legal'],
  ['security', '/security'],
];
const LANGS = ['en', 'fr', 'ar'] as const;

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

describe('the public legal and support pages', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async () => new Response('{}', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('every required page has its stable address, is public and indexable, and is never behind a sign-in', () => {
    for (const [id, path] of LEGAL) {
      const route = PUBLIC_ROUTES.find((r) => r.id === id);
      expect({ id, path: route?.path, indexable: route?.indexable }).toEqual({ id, path, indexable: true });
      expect(pathOf(id, 'fr')).toBe(`/fr${path}`);
      expect(pathOf(id, 'ar')).toBe(`/ar${path}`);
    }
  });

  for (const lang of LANGS) {
    for (const [id] of LEGAL) {
      it(`${pathOf(id, lang)} renders with one heading, its language and direction, and asks the API nothing`, () => {
        mount(pathOf(id, lang));
        expect(document.documentElement.lang).toBe(lang);
        expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
        const main = screen.getByRole('main');
        expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(fetchMock).not.toHaveBeenCalled();
      });
    }
  }

  for (const lang of LANGS) {
    for (const name of Object.keys(LEGAL_DOCUMENTS) as (keyof typeof LEGAL_DOCUMENTS)[]) {
      it(`${name} (${lang}) shows its version, its draft label and every other legal page`, () => {
        const id = name as PublicRouteId;
        mount(pathOf(id, lang));
        const main = screen.getByRole('main');
        const doc = LEGAL_DOCUMENTS[name][lang];
        expect(within(main).getByText(new RegExp(doc.version.replace(/[()]/g, '\\$&')))).toBeTruthy();
        // Drafts say so at the top, in the page's language.
        expect(main.querySelector('.legal-draft')?.textContent).toMatch(/TSX-MR/);
        const related = main.querySelector('.legal-related')!;
        const hrefs = [...related.querySelectorAll('a')].map((a) => a.getAttribute('href'));
        expect(hrefs).toEqual(LEGAL.map(([r]) => pathOf(r, lang)).sort((a, b) => order(a, lang) - order(b, lang)));
      });
    }
  }

  it('the footer links to every legal and support page, on public and signed-in pages alike', () => {
    for (const lang of LANGS) {
      mount(pathOf('home', lang));
      const footer = document.querySelector('footer.chrome-footer')!;
      const hrefs = new Set([...footer.querySelectorAll('a')].map((a) => a.getAttribute('href')));
      for (const [id] of LEGAL) expect({ lang, id, linked: hrefs.has(pathOf(id, lang)) }).toEqual({ lang, id, linked: true });
      cleanup();
    }
    mount('/account');
    const footer = document.querySelector('footer.chrome-footer')!;
    const hrefs = new Set([...footer.querySelectorAll('a')].map((a) => a.getAttribute('href')));
    for (const [id] of LEGAL) expect({ area: 'account', id, linked: hrefs.has(pathOf(id, 'en')) }).toEqual({ area: 'account', id, linked: true });
  });

  it('names TSX-MR as the operator on the privacy policy, the terms and the legal notice', () => {
    for (const id of ['privacy', 'terms', 'legalNotice'] as const) {
      for (const lang of LANGS) {
        mount(pathOf(id, lang));
        expect({ id, lang, operator: screen.getByRole('main').textContent?.includes('TSX-MR') }).toEqual({ id, lang, operator: true });
        cleanup();
      }
    }
  });

  it('embeds no personal data and no real contact in a published text: addresses and numbers come only from the inputs', () => {
    const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phone = /\+?\d[\d ]{7,}\d/;
    for (const [name, doc] of Object.entries(DOCUMENTS)) {
      for (const lang of LANGS) {
        for (const text of textsOf(doc[lang])) {
          expect({ name, lang, text, email: email.test(text), phone: phone.test(text) }).toEqual({ name, lang, text, email: false, phone: false });
        }
      }
    }
  });

  it('the support page sends trial questions to the website and offers no purchase', () => {
    for (const lang of LANGS) {
      mount(pathOf('support', lang));
      const main = screen.getByRole('main');
      expect(main.querySelector('form')).toBeNull();
      expect(within(main).queryAllByRole('button')).toEqual([]);
      cleanup();
    }
  });
});

describe('the legal pages as the mobile app opens them (/in-app/…)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('exist for exactly the seven legal and support pages, in every language', () => {
    expect([...IN_APP_ROUTE_IDS].sort()).toEqual(LEGAL.map(([id]) => id).sort());
    for (const lang of LANGS) for (const id of IN_APP_ROUTE_IDS) expect(inAppRouteAt(inAppPathOf(id, lang))).toMatchObject({ route: { id }, lang });
    expect(inAppRouteAt('/in-app/apply')).toBeNull();
    expect(inAppRouteAt('/in-app/products/dukan-erp')).toBeNull();
    expect(inAppRouteAt('/in-app/account')).toBeNull();
  });

  for (const lang of LANGS) {
    for (const id of IN_APP_ROUTE_IDS) {
      it(`${inAppPathOf(id, lang)}: the same text, no way to sign in, apply or reach a price — links stay in-app`, () => {
        mount(inAppPathOf(id, lang));
        expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!);
        const allowed = new Set([...IN_APP_ROUTE_IDS.flatMap((r) => LANGS.map((l) => inAppPathOf(r, l))), '#main']);
        const outside = hrefs.filter((h) => !allowed.has(h) && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('tel:'));
        expect({ page: inAppPathOf(id, lang), outside }).toEqual({ page: inAppPathOf(id, lang), outside: [] });
        expect(screen.queryAllByRole('button')).toEqual([]);
        expect(document.querySelector('form')).toBeNull();
      });
    }
  }

  it('are never indexed and name their public page as canonical; the sitemap lists only the public pages', () => {
    const site = { publicSiteOrigin: 'https://www.company-domain.mr', displayName: 'TSX-MR', legalName: '', country: '', city: '', address: '', supportEmail: '' };
    const head = headFor({ id: 'privacy', lang: 'fr', title: 't', description: 'd', site, filled: [], preview: false, productName: 'Dukan ERP', inApp: true });
    expect(head.robots).toBe('noindex, nofollow');
    expect(head.canonical).toBe('https://www.company-domain.mr/fr/privacy');
    expect(sitemapXml(site, '2026-10-16')).not.toContain('/in-app/');
    const headers = headersFile({ apiBase: '' }, false);
    for (const prefix of ['', '/fr', '/ar']) expect(headers).toContain(`${prefix}/in-app/*\n  X-Robots-Tag: noindex, nofollow`);
  });
});

/** The order the related links come in (LegalLinks). */
function order(href: string, lang: (typeof LANGS)[number]): number {
  const ids: PublicRouteId[] = ['privacy', 'privacyChoices', 'terms', 'accountDeletion', 'support', 'security', 'legalNotice'];
  return ids.findIndex((id) => pathOf(id, lang) === href);
}
