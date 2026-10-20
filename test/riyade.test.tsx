import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Riyade, coming soon (the owner's brief of 2026-10-20), on a public build: listed after Dukan ERP on the Products page,
 * under the featured Dukan ERP card on the home page and in the footer's products, with a page of its own at
 * `/products/riyade` in three languages. Everywhere it says only the approved words — its name, one line, who makes it
 * and that it is coming soon — and it offers nothing to do but open its page. Dukan ERP is unchanged.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return { ...real, SITE: Object.freeze({ ...real.SITE, siteSurface: 'public', portalOrigin: '' }), SURFACE: 'public' };
});
vi.mock('../src/protected-areas', () => import('../src/protected-areas.public'));

const { App } = await import('../src/app');
const { I18nProvider } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { LANGUAGES } = await import('../src/i18n/languages');
const { API_ROUTE_IDS, IN_APP_ROUTE_IDS, pathOf, publicRouteAt, publicRoutesFor, PUBLIC_ROUTES } = await import('../src/site/routes');
const { metaFor } = await import('../src/site/meta');
const { headFor } = await import('../src/site/head');
const { sitemapXml } = await import('../src/site/generated');
const { allTexts, products } = await import('../src/content');
const { RIYADE_NAME, riyade } = await import('../src/content/riyade');
const { dukanErpPrelaunch } = await import('../src/content/prelaunch');
const { en } = await import('../src/i18n/en');
const { fr } = await import('../src/i18n/fr');
const { ar } = await import('../src/i18n/ar');
const CATALOGUE = { en, fr, ar } as const;

/** The approved copy (the brief), word for word, with TSX-MR as the site names itself. */
const APPROVED = {
  en: { tagline: 'School life, simply connected.', attribution: 'A new TSX-MR product for schools and their communities.', status: 'Coming soon' },
  fr: {
    tagline: 'La vie scolaire, simplement connectée.',
    attribution: 'Un nouveau produit TSX-MR destiné aux établissements scolaires et à leur communauté.',
    status: 'Bientôt disponible',
  },
  ar: { tagline: 'حياة مدرسية أكثر ترابطًا وبساطة', attribution: 'منتج جديد من TSX-MR للمؤسسات التعليمية ومجتمعاتها.', status: 'قريبًا' },
} as const;

/**
 * What its words must never touch, in each language: what it does or is made of, how it is built, money, a free period
 * or a trial, a date or a delay, a beta, a way to register or to wait, a figure, a provider, a sponsor or advertising.
 */
const NEVER = {
  en: /\b(attendance|absen\w*|grades?|marks?|exams?|financ\w*|pay\w*|fees?|pric\w*|costs?|subscri\w*|timetables?|schedul\w*|communicat\w*|messag\w*|chat|notif\w*|facial|faces?|biometric\w*|camera|api|free|trial|beta|sign[ -]?(up|in)|log[ -]?in|regist\w*|wait\w*|newsletter|launch\w*|release\w*|months?|weeks?|days?|dates?|bankily|sedad|sponsor\w*|advert\w*|ads|users?|download\w*)\b/i,
  fr: /(présence|absence|\bnotes?\b|bulletin|examen|financ|paie|paiement|payer|frais|prix|tarif|abonnement|emploi du temps|planning|communication|message|notification|faciale|visage|biométri|caméra|\bapi\b|gratuit|essai|bêta|inscri|connexion|attente|lancement|sortie|\bmois\b|semaine|\bjours?\b|\bdate|bankily|sedad|sponsor|parrain|publicit|utilisateur|télécharg)/i,
  ar: /(حضور|غياب|درجات|علامات|امتحان|مالي|دفع|رسوم|سعر|أسعار|تكلفة|اشتراك|جدول|تواصل|اتصال|رسائل|رسالة|إشعار|الوجه|بيومتر|كاميرا|مجان|تجرب|تجريب|تسجيل|دخول|انتظار|إطلاق|شهر|أسبوع|يوم|تاريخ|رعاية|إعلان|مستخدم|تحميل|تنزيل|bankily|sedad)/i,
} as const;

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

const requests: string[] = [];
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

const hrefs = (root: ParentNode) => [...root.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
const main = () => document.querySelector('main')!;

describe('Riyade’s route and its head', () => {
  it('has one address per language, beside Dukan ERP’s, on the public build — never an app, account or API page', () => {
    expect(PUBLIC_ROUTES.find((r) => r.id === 'riyade')).toEqual({ id: 'riyade', path: '/products/riyade', indexable: true });
    expect(LANGUAGES.map((l) => pathOf('riyade', l))).toEqual(['/products/riyade', '/fr/products/riyade', '/ar/products/riyade']);
    expect(publicRoutesFor('public').some((r) => r.id === 'riyade')).toBe(true);
    expect(IN_APP_ROUTE_IDS).not.toContain('riyade');
    expect(API_ROUTE_IDS).not.toContain('riyade');
    // Dukan ERP keeps its address, and stays listed first.
    expect(PUBLIC_ROUTES.find((r) => r.id === 'dukanErp')).toEqual({ id: 'dukanErp', path: '/products/dukan-erp', indexable: true });
    expect(PUBLIC_ROUTES.findIndex((r) => r.id === 'dukanErp')).toBeLessThan(PUBLIC_ROUTES.findIndex((r) => r.id === 'riyade'));
  });

  for (const lang of LANGUAGES) {
    it(`its title and description in ${lang}: its name, who makes it, for whom, and that it is coming soon`, () => {
      expect(metaFor('riyade', lang)).toEqual({ title: 'Riyade — {displayName}', description: `${riyade[lang].attribution} ${riyade[lang].status}.` });
    });
  }

  it('names its canonical address and the three alternates, and describes no software anyone could use or buy', () => {
    const ORIGIN = 'https://tsxmr.com';
    const site = { publicSiteOrigin: ORIGIN, displayName: 'TSX-MR', legalName: '', operatorType: 'individual', country: 'Mauritania', city: '', address: '', supportEmail: '', contactEmail: 'contact@tsxmr.com' };
    for (const lang of LANGUAGES) {
      const head = headFor({ id: 'riyade', lang, title: `Riyade — TSX-MR`, description: `${APPROVED[lang].attribution} ${APPROVED[lang].status}.`, site, filled: [], preview: false, productName: 'Dukan ERP' });
      expect(head.canonical).toBe(`${ORIGIN}${pathOf('riyade', lang)}`);
      expect(head.alternates).toEqual([
        { hreflang: 'en', href: `${ORIGIN}/products/riyade` },
        { hreflang: 'fr', href: `${ORIGIN}/fr/products/riyade` },
        { hreflang: 'ar', href: `${ORIGIN}/ar/products/riyade` },
        { hreflang: 'x-default', href: `${ORIGIN}/products/riyade` },
      ]);
      expect(head.robots).toBe('index, follow');
      expect(head.meta).toContainEqual({ property: 'og:url', content: `${ORIGIN}${pathOf('riyade', lang)}` });
      expect(head.meta).toContainEqual({ property: 'og:title', content: 'Riyade — TSX-MR' });
      // The organization only: no SoftwareApplication or Product, no offer, price, rating, platform or date.
      const graph = (head.jsonLd[0] as { '@graph': { '@type': string }[] })['@graph'];
      expect(graph.map((n) => n['@type'])).toEqual(['Organization']);
      expect(JSON.stringify(head.jsonLd)).not.toMatch(/Riyade|SoftwareApplication|Product|offers|price|availability|rating|operatingSystem|release|date/i);
    }
  });

  it('is in the sitemap in three languages, each with its alternates', () => {
    const xml = sitemapXml({ publicSiteOrigin: 'https://tsxmr.com', siteSurface: 'public' }, '2026-10-20');
    for (const lang of LANGUAGES) expect(xml).toContain(`<loc>https://tsxmr.com${pathOf('riyade', lang)}</loc>`);
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ar" href="https://tsxmr.com/ar/products/riyade"/>');
  });
});

describe('Riyade’s words', () => {
  it('are the approved copy in each language, and its name is never translated', () => {
    for (const lang of LANGUAGES) {
      expect({ ...riyade[lang], attribution: riyade[lang].attribution.replace('{displayName}', 'TSX-MR') }).toEqual(APPROVED[lang]);
    }
    expect(RIYADE_NAME).toBe('Riyade');
  });

  it('say nothing it must not — no feature, money, date, trial, beta, registration, waiting list, figure or provider — in its texts or its head', () => {
    for (const lang of LANGUAGES) {
      const words = [...Object.values(riyade[lang]), metaFor('riyade', lang).title, metaFor('riyade', lang).description].join('\n');
      expect({ lang, found: words.match(NEVER[lang])?.[0] ?? null }).toEqual({ lang, found: null });
      expect({ lang, digits: /[0-9٠-٩]/.test(words) }).toEqual({ lang, digits: false });
    }
  });

  it('are published texts, so the release check reads them', () => {
    for (const lang of LANGUAGES) expect(allTexts(lang, 'public')).toEqual(expect.arrayContaining(Object.values(riyade[lang])));
  });
});

describe('Riyade on a public build, page by page', () => {
  for (const lang of LANGUAGES) {
    const page = pathOf('riyade', lang);

    it(`its page in ${lang}: the name as the one heading, its line, who makes it, coming soon — and nothing to do`, () => {
      mount(page);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Riyade');
      expect(document.documentElement.lang).toBe(lang);
      expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      // Exactly the approved words, in this order, and no other.
      expect(main().textContent).toBe(`Riyade${APPROVED[lang].tagline}${APPROVED[lang].attribution}${APPROVED[lang].status}`);
      // TSX-MR keeps its reading order inside the Arabic sentence.
      expect([...main().querySelectorAll('bdi')].map((b) => b.textContent)).toEqual(['TSX-MR']);
      // No sign-up, sign-in, price, trial, waiting list, documentation or contact action: no link, button or field.
      expect(main().querySelectorAll('a, button, form, input, select, textarea, iframe, img, video')).toHaveLength(0);
      // The drawing is decoration only.
      expect(main().querySelector('svg.riyade-art')?.getAttribute('aria-hidden')).toBe('true');
      expect(document.title).toBe('Riyade — TSX-MR');
      expect(requests).toEqual([]);
    });

    it(`the Products page in ${lang}: Dukan ERP first and unchanged, then Riyade, each with its own status in words`, () => {
      mount(pathOf('products', lang));
      const cards = [...main().querySelectorAll('ul.products-grid > li')];
      expect(cards).toHaveLength(2);
      const [dukan, card] = cards as [HTMLElement, HTMLElement];
      // Dukan ERP: its mark, its six parts, its status, its page as the primary action and Contact.
      expect(dukan.querySelector('h2')?.textContent).toBe('DDukan ERP');
      expect(dukan.querySelectorAll('.feature-list li')).toHaveLength(6);
      expect(within(dukan).getByText(CATALOGUE[lang]['prelaunch.badge'])).toBeTruthy();
      expect([...dukan.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.className])).toEqual([
        [pathOf('dukanErp', lang), 'btn btn-primary'],
        [pathOf('contact', lang), 'btn'],
      ]);
      // Riyade: its wordmark as the heading, its line, who makes it, coming soon, and one quiet button to its page.
      expect(card.querySelector('h2')?.textContent).toBe('Riyade');
      expect(card.textContent).toBe(`Riyade${APPROVED[lang].tagline}${APPROVED[lang].attribution}${APPROVED[lang].status}Riyade`);
      expect([...card.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.className])).toEqual([[pathOf('riyade', lang), 'btn']]);
      expect(card.querySelectorAll('button, form, input, .feature-list')).toHaveLength(0);
      // The statuses cannot be mixed up: each card states its own, and Riyade's is not Dukan ERP's.
      expect(dukan.textContent).not.toContain('Riyade');
      expect(card.textContent).not.toContain('Dukan');
      expect(card.textContent).not.toContain(CATALOGUE[lang]['prelaunch.badge']);
      // The summary no longer says there is one product.
      expect(main().querySelector('h1 + p')?.textContent).toBe(products[lang].summary.replace('{displayName}', 'TSX-MR'));
    });

    it(`the home page in ${lang}: one row under the featured Dukan ERP card, which leads to Riyade’s page`, () => {
      mount(pathOf('home', lang));
      const featured = main().querySelector('.featured-product')!;
      expect(within(featured as HTMLElement).getByText(CATALOGUE[lang]['prelaunch.badge'])).toBeTruthy();
      expect(hrefs(featured)).toContain(pathOf('dukanErp', lang));
      expect(featured.textContent).not.toContain('Riyade');
      const row = main().querySelector('.riyade-row')!;
      // After the featured card, never before or inside it.
      expect(featured.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(hrefs(row)).toEqual([pathOf('riyade', lang)]);
      expect(row.textContent).toBe(`Riyade${APPROVED[lang].attribution}${APPROVED[lang].status}`);
      expect(row.closest('section')?.getAttribute('aria-labelledby')).toBe('riyade-row-name');
    });

    it(`the footer in ${lang}: Dukan ERP, Riyade and the Products page, in that order, under "${CATALOGUE[lang]['footer.product']}"`, () => {
      mount(pathOf('about', lang));
      const column = document.querySelector(`footer nav[aria-label="${CATALOGUE[lang]['footer.product']}"]`)!;
      expect(hrefs(column)).toEqual([pathOf('dukanErp', lang), pathOf('riyade', lang), pathOf('products', lang)]);
      expect(within(column as HTMLElement).getByRole('link', { name: 'Riyade' })).toBeTruthy();
    });

    it(`switching language from its page in ${lang} keeps Riyade’s page`, () => {
      mount(page);
      expect(hrefs(document.querySelector('.languages-wide')!)).toEqual(LANGUAGES.map((l) => pathOf('riyade', l)));
    });

    it(`the Dukan ERP page in ${lang} is untouched: its title, summary and status, and no word of Riyade`, () => {
      expect(metaFor('dukanErp', lang)).toEqual({ title: 'Dukan ERP — {displayName}', description: dukanErpPrelaunch[lang].summary });
      mount(pathOf('dukanErp', lang));
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('DDukan ERP');
      expect(screen.getByText(CATALOGUE[lang]['prelaunch.badge'])).toBeTruthy();
      expect(main().textContent).not.toContain('Riyade');
    });

    it(`no page that shows Riyade in ${lang} links anywhere this build does not publish`, () => {
      const published = new Set(publicRoutesFor('public').map((r) => r.id));
      for (const id of ['home', 'products', 'riyade', 'dukanErp'] as const) {
        mount(pathOf(id, lang));
        for (const href of hrefs(document).filter((h) => h.startsWith('/'))) {
          const target = publicRouteAt(href.split('#')[0]!);
          expect({ id, href, published: !!target && published.has(target.route.id) }).toEqual({ id, href, published: true });
        }
        cleanup();
      }
    });
  }
});
