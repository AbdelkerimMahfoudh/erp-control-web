import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';
import { IN_APP_ROUTE_IDS, inAppPathOf, pathOf, publicRoutesFor } from '../src/site/routes';

/**
 * The pre-launch public website (`VITE_SITE_SURFACE=public`, docs/96) in a real browser, served as Cloudflare Pages
 * serves it (`_headers` included). Run with `E2E_SURFACE=public` against a public build: every page in EN, FR and AR at
 * a phone and a desktop width — status, language and direction, one h1, no sideways scroll, the WCAG 2.1 AA audit, no
 * request to any other origin, no sign-in, application, account or console link — with a screenshot of each.
 */
const EV = process.env.EV ?? 'e2e-output';
const LANGS = ['en', 'fr', 'ar'] as const;
const CATALOGUE = { en, fr, ar };
const ROUTES = publicRoutesFor('public');
const WIDTHS = [
  { name: '375', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

function shot(variant: string, lang: string, path: string): string {
  const rest = path.replace(/^\/(fr|ar)(?=\/|$)/, '') || '/';
  return join(EV, 'screenshots', variant, `${lang}${rest === '/' ? '-home' : rest.replace(/\//g, '-')}.jpg`);
}

function record(name: string, f: Record<string, unknown>) {
  const file = join(EV, 'browser', `${name.replace(/[^\w.-]+/g, '_')}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(f, null, 2));
}

/** Every request the page makes, and every console error (a CSP refusal included). */
function watch(page: Page, origin: string) {
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(origin) && !url.startsWith('data:')) foreign.push(url);
  });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return { foreign, errors };
}

async function facts(page: Page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    links: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? ''),
    forms: document.querySelectorAll('form').length,
    passwords: document.querySelectorAll('input[type="password"]').length,
    text: document.body.innerText,
  }));
}

const ACCOUNT_LINK = /^(https?:\/\/[^/]+)?(\/(fr|ar))?\/(apply|login|application-status|account|admin)(\/|$|\?)/;

for (const lang of LANGS) {
  for (const route of ROUTES) {
    for (const w of WIDTHS) {
      const path = pathOf(route.id, lang);
      test(`public site ${path} at ${w.name}`, async ({ page, baseURL }) => {
        const seen = watch(page, baseURL!);
        await page.setViewportSize({ width: w.width, height: w.height });
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await page.waitForLoadState('networkidle');
        const f = await facts(page);
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        await page.screenshot({ path: shot(`${lang}-${w.name}`, lang, path), fullPage: true, type: 'jpeg', quality: 70 });
        let overflow320 = 0;
        if (w.width === 375) {
          await page.setViewportSize({ width: 320, height: 720 });
          overflow320 = (await facts(page)).overflow;
        }
        record(`${lang}-${w.name}-${route.id}`, { path, lang, width: w.width, overflow: f.overflow, overflow320, foreign: seen.foreign, errors: seen.errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
        expect(f.lang).toBe(lang);
        expect(f.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
        expect(f.h1).toBe(1);
        expect(f.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
        expect(overflow320, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
        expect(f.forms, 'no form on the pre-launch website').toBe(0);
        expect(f.passwords).toBe(0);
        expect(f.links.filter((h) => ACCOUNT_LINK.test(h)), 'no sign-in, application, account or console link').toEqual([]);
        expect(seen.foreign, 'no request to any other origin (no API, no analytics)').toEqual([]);
        expect(seen.errors).toEqual([]);
        expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      });
    }
  }

  test(`public site: Dukan ERP is presented as coming soon in ${lang}, with no price and no trial`, async ({ page }) => {
    for (const id of ['home', 'dukanErp'] as const) {
      await page.goto(pathOf(id, lang));
      const f = await facts(page);
      expect(f.text).toContain(CATALOGUE[lang]['prelaunch.badge']);
      expect(f.text).not.toContain(CATALOGUE[lang]['home.pricing.loading']);
      expect(f.text).not.toMatch(/MRU|\b7-day\b|essai gratuit|تجربة مجانية/);
    }
  });

  test(`public site: who operates it, said plainly in ${lang} — an individual, no company, nothing invented`, async ({ page }) => {
    const c = CATALOGUE[lang];
    for (const id of ['legalNotice', 'contact', 'about'] as const) {
      await page.goto(pathOf(id, lang));
      const text = (await facts(page)).text;
      expect(text).toContain(c['org.statusIndividual']);
      expect(text).toContain('Abdel Kerim Taleb Ould Sidi');
      // No legal form, trade-register number or company label is ever shown for an individual operator.
      expect(text).not.toContain(c['org.legalForm']);
      expect(text).not.toContain(c['org.registration']);
    }
    await page.goto(pathOf('legalNotice', lang));
    expect((await facts(page)).text).toContain(c['org.publicationDirector']);
    // The footer of every page says the same in one sentence.
    expect((await facts(page)).text).toContain(c['footer.operatorIndividual'].replace('{name}', 'TSX-MR').replace('{operator}', 'Abdel Kerim Taleb Ould Sidi'));
    // The correspondence address the owner gave, in the reader's language, on the legal notice and in the footer —
    // with no street number or postal code, because none was given.
    const address = { en: 'Tevragh Zeina, Nouakchott-Ouest, Mauritania', fr: 'Tevragh Zeina, Nouakchott-Ouest, Mauritanie', ar: 'تفرغ زينة، نواكشوط الغربية، موريتانيا' }[lang];
    expect(await page.locator('.org-details').textContent()).toContain(address);
    expect(await page.locator('.chrome-footer').textContent()).toContain(address);
    // The contacts: the four mailboxes as mail links; the configured numbers as call links, none labelled WhatsApp.
    await page.goto(pathOf('contact', lang));
    const links = (await facts(page)).links;
    for (const box of ['contact', 'support', 'privacy', 'security']) expect(links).toContain(`mailto:${box}@tsxmr.com`);
    const phones = (process.env.VITE_ORGANIZATION_PHONE ?? '').split(',').map((p) => p.trim()).filter(Boolean);
    for (const phone of phones) expect(links).toContain(`tel:${phone.replace(/\s+/g, '')}`);
    expect(await page.locator('.contact-label', { hasText: c['org.whatsapp'] }).count()).toBe(0);
  });

  test(`public site: the pages the app opens answer in ${lang}, without the site's navigation`, async ({ page }) => {
    for (const id of IN_APP_ROUTE_IDS) {
      const response = await page.goto(inAppPathOf(id, lang));
      expect(response?.status()).toBe(200);
      expect(await page.locator('h1').count()).toBe(1);
    }
  });
}

test('public site: the host files and the security headers; no account, console or application address', async ({ request }) => {
  const home = await request.get('/');
  const h = home.headers();
  expect(h['content-security-policy']).toContain("connect-src 'self';");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  // HSTS is sent over HTTPS only (scripts/serve-dist.mjs drops it on this plain-HTTP server, as browsers ignore it there);
  // its presence in `_headers` is checked by the unit tests and the release verdict (`--dist`).
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  for (const path of ['/account', '/account/trial', '/admin', '/admin/businesses', '/apply', '/login', '/application-status', '/fr/apply', '/app-shell.html']) {
    expect({ path, status: (await request.get(path)).status() }).toEqual({ path, status: 404 });
  }
  for (const path of ['/robots.txt', '/site.webmanifest', '/fr/privacy', '/ar/terms', '/ar/in-app/privacy']) {
    expect({ path, status: (await request.get(path)).status() }).toEqual({ path, status: 200 });
  }
});
