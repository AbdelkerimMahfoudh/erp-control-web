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
import { formatDate } from '../src/lib/format';
import { TERMS_EFFECTIVE } from '../src/content/legal-terms';

/**
 * The public legal and support pages (the owner's brief of 2026-10-16, docs/85): each exists at its stable address in
 * three languages, needs no sign-in and no API, says who operates the service, is labelled a draft until TSXMR approves
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
      it(`${name} (${lang}) shows its approved version, no draft label, and every other legal page`, () => {
        const id = name as PublicRouteId;
        mount(pathOf(id, lang));
        const main = screen.getByRole('main');
        const doc = LEGAL_DOCUMENTS[name][lang];
        expect(within(main).getByText(new RegExp(doc.version.replace(/[()]/g, '\\$&')))).toBeTruthy();
        // Approved (owner, 2026-11-04): version 1.0 and no draft label; the deletion page 1.1 (owner, 2026-11-05:
        // email-assisted deletion at launch, effective the same date), and privacy 1.1 with it.
        // Terms 1.1 (owner, 2026-11-12): an additional store's own term; account deletion and privacy were 1.1 before.
        expect(doc.version).toBe(name === 'accountDeletion' || name === 'privacy' || name === 'terms' ? '1.1' : '1.0');
        expect(main.querySelector('.legal-draft')).toBeNull();
        // One group of related pages (the brief of 2026-10-17, fourth): every other page a link, this one plain text
        // marked current — never a link back to itself.
        expect(main.querySelectorAll('.legal-related')).toHaveLength(1);
        const related = main.querySelector('.legal-related')!;
        const hrefs = [...related.querySelectorAll('a')].map((a) => a.getAttribute('href'));
        // Account deletion is a Dukan ERP document (2026-10-19): the company's quick links leave it out, so on its own
        // page none of them is current.
        const others = LEGAL.filter(([r]) => r !== 'accountDeletion').map(([r]) => pathOf(r, lang)).filter((h) => h !== pathOf(id, lang));
        expect(hrefs).toEqual(others.sort((a, b) => order(a, lang) - order(b, lang)));
        const current = related.querySelector('[aria-current="page"]');
        expect(current?.tagName ?? null).toBe(id === 'accountDeletion' ? null : 'SPAN');
        expect(related.querySelector(`a[href="${pathOf(id, lang)}"]`)).toBeNull();
      });
    }
  }

  it('the public footer links to every legal and support page but account deletion; the portal’s footer keeps it in context', () => {
    // Account deletion is a Dukan ERP document, reached from the product page and Support (2026-10-19).
    const linked = (id: PublicRouteId) => id !== 'accountDeletion';
    for (const lang of LANGS) {
      mount(pathOf('home', lang));
      const footer = document.querySelector('footer.chrome-footer')!;
      const hrefs = new Set([...footer.querySelectorAll('a')].map((a) => a.getAttribute('href')));
      for (const [id] of LEGAL) expect({ lang, id, linked: hrefs.has(pathOf(id, lang)) }).toEqual({ lang, id, linked: linked(id) });
      cleanup();
    }
    mount('/subscription');
    const footer = document.querySelector('footer.chrome-footer')!;
    const hrefs = new Set([...footer.querySelectorAll('a')].map((a) => a.getAttribute('href')));
    // The portal is Dukan ERP's own surface: its footer keeps account deletion in context, like the pages the app opens (D216).
    for (const [id] of LEGAL) expect({ area: 'subscription', id, linked: hrefs.has(pathOf(id, 'en')) }).toEqual({ area: 'subscription', id, linked: true });
  });

  it('names TSXMR as the operator on the privacy policy, the terms and the legal notice', () => {
    for (const id of ['privacy', 'terms', 'legalNotice'] as const) {
      for (const lang of LANGS) {
        mount(pathOf(id, lang));
        expect({ id, lang, operator: screen.getByRole('main').textContent?.includes('TSXMR') }).toEqual({ id, lang, operator: true });
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
        // A link to a section of the same page keeps its page (`/in-app/privacy#who`).
        const outside = hrefs.filter((h) => !allowed.has(h.split('#')[0]!) && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('tel:'));
        // The page adds no group of its own: the app's footer is the only list of the legal pages.
        expect(document.querySelector('main .legal-related')).toBeNull();
        expect(document.querySelectorAll('.in-app-footer .legal-links')).toHaveLength(1);
        expect({ page: inAppPathOf(id, lang), outside }).toEqual({ page: inAppPathOf(id, lang), outside: [] });
        expect(screen.queryAllByRole('button')).toEqual([]);
        expect(document.querySelector('form')).toBeNull();
      });
    }
  }

  it('are never indexed and name their public page as canonical; the sitemap lists only the public pages', () => {
    const site = { publicSiteOrigin: 'https://www.company-domain.mr', displayName: 'TSXMR', legalName: '', operatorType: 'individual', country: '', city: '', address: '', supportEmail: '', contactEmail: '' };
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

/*
 * Terms 1.1 (owner, 2026-11-12): an additional store has no free trial; its own paid term begins when its access opens;
 * a refused payment withdraws only what it granted; never charged twice for the same store and days. The seat paragraph
 * and the 30-day notice clause stay. The version and its own effective date, on the terms only, in each language.
 */
describe('the terms, version 1.1', () => {
  const STORE = {
    en: 'The business’s free trial does not cover additional stores. An additional store can open during the trial, and its own paid term begins on the date access opens. If we refuse the payment, we withdraw only the access granted for that payment. We do not charge twice for the same store and the same days.',
    fr: 'L’essai gratuit de l’entreprise ne couvre pas les boutiques supplémentaires. Une boutique supplémentaire peut ouvrir pendant l’essai, et sa propre période d’abonnement commence à la date d’ouverture de l’accès. Si nous refusons le paiement, nous retirons uniquement l’accès accordé au titre de ce paiement. Nous ne facturons pas deux fois les mêmes jours pour une même boutique.',
    ar: 'لا تشمل التجربة المجانية للنشاط التجاري المتاجر الإضافية. يمكن فتح متجر إضافي أثناء التجربة، وتبدأ مدة اشتراكه المدفوعة من تاريخ إتاحة الوصول إليه. إذا رفضنا الدفعة، نلغي فقط الوصول الذي أُتيح مقابلها. لا نفرض رسومًا مرتين على المتجر نفسه عن الأيام نفسها.',
  } as const;
  const SEAT = { en: /^A seat requested during the free trial may be paid during it/, fr: /^Une place demandée pendant l’essai gratuit peut être payée/, ar: /^أما المقعد المطلوب خلال التجربة المجانية/ } as const;
  const NOTICE = { en: /at least 30 days before it applies/, fr: /au moins 30 jours avant de s’appliquer/, ar: /قبل 30 يومًا على الأقل من سريانه/ } as const;

  for (const lang of LANGS) {
    it(`${lang}: the store and seat paragraphs, version 1.1 and its own effective date, the notice clause unchanged`, () => {
      localStorage.setItem('erp.web.language', lang);
      mount(pathOf('terms', lang));
      const main = screen.getByRole('main');
      expect(within(main).getByText(STORE[lang])).toBeTruthy();
      expect(within(main).getByText(SEAT[lang])).toBeTruthy();
      expect(main.textContent).toMatch(NOTICE[lang]);
      expect(main.textContent).toContain(lang === 'ar' ? '1.1' : 'Version 1.1');
      expect(main.textContent).toContain(formatDate(`${TERMS_EFFECTIVE}T00:00:00Z`, lang));
      // The old trial sentence for stores is gone.
      expect(main.textContent).not.toMatch(/A store or a seat requested during the free trial|Une boutique ou une place demandée pendant l’essai|المتجر أو المقعد المطلوب خلال التجربة/);
    });
  }

  it('the effective date is the terms’ own: the other legal texts keep the site’s date', async () => {
    const { terms, TERMS_EFFECTIVE } = await import('../src/content/legal-terms');
    expect(TERMS_EFFECTIVE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const lang of LANGS) expect([terms[lang].version, terms[lang].effective]).toEqual(['1.1', TERMS_EFFECTIVE]);
    for (const [name, doc] of Object.entries(LEGAL_DOCUMENTS)) if (name !== 'terms') for (const lang of LANGS) expect({ name, lang, effective: doc[lang].effective }).toEqual({ name, lang, effective: undefined });
  });
});
