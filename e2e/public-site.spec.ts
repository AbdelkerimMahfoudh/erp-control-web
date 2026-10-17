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
    expect(await page.locator('.contact-card', { hasText: c['org.whatsapp'] }).count()).toBe(0);
  });

  // The 2026-10-17 refinement: contact cards, the header theme toggle, one card elevation system.
  test(`public site: the contact methods are cards with real mail and call links in ${lang}, whole at 320 px`, async ({ page }) => {
    const c = CATALOGUE[lang];
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(pathOf('contact', lang));
      const cards = page.locator('.contact-methods .contact-card');
      expect(await cards.count()).toBeGreaterThanOrEqual(4);
      for (const box of ['contact', 'support', 'privacy', 'security']) {
        const link = page.locator(`.contact-link[href="mailto:${box}@tsxmr.com"]`);
        await expect(link).toHaveCount(1);
        await expect(link).toContainText(`${box}@tsxmr.com`);
        expect(await link.getAttribute('aria-label')).toContain(`${box}@tsxmr.com`);
      }
      const phones = (process.env.VITE_ORGANIZATION_PHONE ?? '').split(',').map((p) => p.trim()).filter(Boolean);
      for (const phone of phones) {
        const link = page.locator(`.contact-link[href="tel:${phone.replace(/\s+/g, '')}"]`);
        await expect(link).toHaveCount(1);
        expect(await link.getAttribute('aria-label')).toBe(c['contact.callName'].replace('{value}', phone));
      }
      // Nothing sticks out of its card or the page, and every card is at least a comfortable touch target.
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll('.contact-card')].map((card) => {
          const r = card.getBoundingClientRect();
          const value = card.querySelector('.contact-value')!.getBoundingClientRect();
          return { left: r.left, right: r.right, height: r.height, inside: value.left >= r.left - 0.5 && value.right <= r.right + 0.5, vw: document.documentElement.clientWidth };
        }),
      );
      for (const b of boxes) {
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.right).toBeLessThanOrEqual(b.vw);
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.inside).toBe(true);
      }
      // A value never breaks inside itself (an address or a number stays on one line).
      const lines = await page.evaluate(() => [...document.querySelectorAll('.contact-value')].map((v) => Math.round(v.getBoundingClientRect().height / parseFloat(getComputedStyle(v).lineHeight))));
      expect(lines.every((n) => n === 1), `values on one line at ${width}px: ${lines}`).toBe(true);
      expect((await facts(page)).overflow).toBeLessThanOrEqual(0);
    }
    if (lang === 'ar') {
      // In Arabic the card reads right to left (icon first, on the right) while the value stays left to right.
      const geo = await page.locator('.contact-link').first().evaluate((a) => ({
        icon: a.querySelector('.contact-icon')!.getBoundingClientRect().left,
        action: a.querySelector('.contact-action')!.getBoundingClientRect().left,
        valueDir: a.querySelector('.contact-value')!.getAttribute('dir'),
      }));
      expect(geo.icon).toBeGreaterThan(geo.action);
      expect(geo.valueDir).toBe('ltr');
    }
  });

  test(`public site: the theme is a header toggle in ${lang}, named for its action, kept across pages and reloads`, async ({ page }) => {
    const c = CATALOGUE[lang];
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(pathOf('home', lang));
      const toggle = page.locator('.chrome-header button.theme-toggle');
      await expect(toggle).toBeVisible();
      const box = (await toggle.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      // The header stays one row: the toggle on the same line as the mark.
      const mark = (await page.locator('.chrome-header .brand').boundingBox())!;
      expect(Math.abs(mark.y + mark.height / 2 - (box.y + box.height / 2))).toBeLessThan(8);
    }
    expect(await page.locator('.chrome-footer select, .chrome-footer .theme-choice, .chrome-footer .theme-toggle').count(), 'no appearance control in the footer').toBe(0);
    const toggle = page.locator('.chrome-header button.theme-toggle');
    await expect(toggle).toHaveAttribute('aria-label', c['theme.toDark']);
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-label', c['theme.toLight']);
    expect(await page.evaluate(() => localStorage.getItem('erp.web.theme'))).toBe('dark');
    await page.goto(pathOf('contact', lang));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.chrome-header button.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('erp.web.theme'))).toBe('light');
  });

  test(`public site: the Launch cards share the card elevation and rise on hover, not under reduced motion (${lang})`, async ({ browser }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const context = await browser.newContext({ reducedMotion, viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await page.goto(pathOf('dukanErp', lang));
      const card = page.locator('section:has(#start-h) li').first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      expect(await card.getAttribute('class')).toContain('elevated');
      const rest = await card.evaluate((e) => ({ shadow: getComputedStyle(e).boxShadow, translate: getComputedStyle(e).translate }));
      expect(rest.shadow).not.toBe('none');
      await card.hover();
      await page.waitForTimeout(400);
      const hover = await card.evaluate((e) => ({ shadow: getComputedStyle(e).boxShadow, translate: getComputedStyle(e).translate }));
      expect(hover.shadow).not.toBe(rest.shadow);
      if (reducedMotion === 'reduce') expect(hover.translate === 'none' || hover.translate === '0px').toBe(true);
      else expect(hover.translate).toBe('0px -3px');
      await context.close();
    }
  });

  test(`public site: the phone menu is an icon button in ${lang} — opens, closes, keeps focus, shows EN FR AR`, async ({ page }) => {
    const c = CATALOGUE[lang];
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(pathOf('privacy', lang));
      const button = page.locator('.chrome-header button.menu-button');
      const panel = page.locator('#site-menu');
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-label', c['nav.openMenu']);
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(button).toHaveAttribute('aria-controls', 'site-menu');
      expect((await button.innerText()).trim(), 'no visible word on the button').toBe('');
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      // The bar stays one row: the button beside the mark, inside the screen.
      const mark = (await page.locator('.chrome-header .brand').boundingBox())!;
      expect(Math.abs(mark.y + mark.height / 2 - (box.y + box.height / 2))).toBeLessThan(8);
      expect(box.x >= 0 && box.x + box.width <= width).toBe(true);
      // Closed: none of its links is reachable from the keyboard.
      await expect(panel).toBeHidden();
      await button.focus();
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('#site-menu'))).toBe(false);
      // Open from the keyboard: the cross, the action's name, the destinations and the three codes.
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(button).toHaveAttribute('aria-label', c['nav.closeMenu']);
      await expect(panel).toBeVisible();
      const codes = panel.locator('ul.languages a');
      expect(await codes.allInnerTexts()).toEqual(['EN', 'FR', 'AR']);
      expect(await codes.evaluateAll((as) => as.map((a) => a.getAttribute('aria-label')))).toEqual(['English', 'Français', 'العربية']);
      await expect(panel.locator(`ul.languages a[lang="${lang}"]`)).toHaveAttribute('aria-current', 'true');
      for (const a of await panel.locator('a').all()) expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const panelBox = (await panel.boundingBox())!;
      expect(panelBox.x >= 0 && panelBox.x + panelBox.width <= width, 'the open menu stays on screen').toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: shot(`menu-open-${width}`, lang, pathOf('privacy', lang)), type: 'jpeg', quality: 75 });
      // Escape closes it and gives focus back to the button.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      expect(await page.evaluate(() => document.activeElement?.classList.contains('menu-button'))).toBe(true);
      // Tab past its last link closes it where the reader is.
      await page.keyboard.press('Enter');
      await panel.locator('a').last().focus();
      await page.keyboard.press('Tab');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
    }
    // Choosing a destination opens that page with the menu closed.
    await page.locator('.chrome-header button.menu-button').click();
    await page.locator('#site-menu .nav a').last().click();
    await expect(page).toHaveURL(new RegExp(`${pathOf('contact', lang)}$`));
    await expect(page.locator('.chrome-header button.menu-button')).toHaveAttribute('aria-expanded', 'false');
  });

  test(`public site: choosing a language from the phone menu keeps the page and the appearance (${lang})`, async ({ page }) => {
    const other = lang === 'ar' ? 'en' : 'ar';
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(pathOf('privacy', lang));
    await page.locator('.chrome-header button.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.chrome-header button.menu-button').click();
    await page.locator(`#site-menu ul.languages a[lang="${other}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${pathOf('privacy', other)}$`));
    // The address changes first; the document's language follows on the next render, so wait for it rather than race it.
    await expect.poll(() => page.evaluate(() => [document.documentElement.lang, document.documentElement.dir, document.documentElement.dataset.theme])).toEqual([
      other,
      other === 'ar' ? 'rtl' : 'ltr',
      'dark',
    ]);
    expect(await page.evaluate(() => localStorage.getItem('erp.web.language'))).toBe(other);
    await page.reload();
    expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme])).toEqual([other, 'dark']);
  });

  test(`public site: every link looks like what it does in ${lang} — none is a raw template anchor`, async ({ page }) => {
    const paths = [...ROUTES.map((r) => pathOf(r.id, lang)), ...IN_APP_ROUTE_IDS.map((id) => inAppPathOf(id, lang))];
    const raw: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      // A link with no family of its own is running text: it must carry the text-link treatment (a set underline offset),
      // never the browser's default underline.
      const found = await page.$$eval('main a[href], .in-app-footer a[href]', (as) =>
        as
          .filter((a) => {
            const cs = getComputedStyle(a);
            return !a.className && cs.textDecorationLine.includes('underline') && cs.textUnderlineOffset === 'auto';
          })
          .map((a) => `${a.textContent?.trim()} → ${a.getAttribute('href')}`),
      );
      raw.push(...found.map((f) => `${path}: ${f}`));
    }
    record(`links-${lang}`, { pages: paths.length, raw });
    expect(raw).toEqual([]);
  });

  test(`public site: the contents are rows that land each section below the sticky header (${lang})`, async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(pathOf('privacy', lang));
      const rows = page.locator('nav.toc a.toc-link');
      const count = await rows.count();
      expect(count).toBeGreaterThan(5);
      for (const row of await rows.all()) expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      // In Arabic the number sits at the start of the line, on the right.
      const first = rows.first();
      const [num, text] = [(await first.locator('.toc-num').boundingBox())!, (await first.locator('.toc-text').boundingBox())!];
      expect(lang === 'ar' ? num.x > text.x : num.x < text.x).toBe(true);
      for (const i of [Math.floor(count / 2), count - 1]) {
        await page.goto(pathOf('privacy', lang));
        await rows.nth(i).click();
        await page.waitForTimeout(300);
        const gap = await page.evaluate(() => {
          const header = document.querySelector('.chrome-header')!.getBoundingClientRect();
          const heading = document.querySelector(`${location.hash} h2`)!.getBoundingClientRect();
          return heading.top - header.bottom;
        });
        expect(gap, `section ${i + 1} at ${width} px lands below the header`).toBeGreaterThanOrEqual(0);
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pathOf('privacy', lang));
    await page.locator('nav.toc').screenshot({ path: shot('toc', lang, pathOf('privacy', lang)) });
  });

  test(`public site: the pages the app opens answer in ${lang}, without the site's navigation`, async ({ page }) => {
    for (const id of IN_APP_ROUTE_IDS) {
      const response = await page.goto(inAppPathOf(id, lang));
      expect(response?.status()).toBe(200);
      expect(await page.locator('h1').count()).toBe(1);
    }
  });
}

/**
 * The page for an address that leads nowhere (the owner's brief of 2026-10-17): served with a 404 status, as the nearest
 * prerendered 404.html — in the address's language, with the app's frame under `/in-app/` — never a redirect and never
 * a 200. Its files load from any depth, it is never indexed, and it says nothing it was not told.
 */
const MISSING = [
  { path: '/qx7-missing', lang: 'en', inApp: false },
  { path: '/a/b/c/d/e/missing-deep', lang: 'en', inApp: false },
  { path: '/fr/inexistante', lang: 'fr', inApp: false },
  { path: '/fr/a/b/c', lang: 'fr', inApp: false },
  { path: '/ar/x/y/z', lang: 'ar', inApp: false },
  { path: '/account', lang: 'en', inApp: false },
  { path: '/admin/businesses', lang: 'en', inApp: false },
  { path: '/in-app/nope', lang: 'en', inApp: true },
  { path: '/fr/in-app/nope', lang: 'fr', inApp: true },
  { path: '/ar/in-app/a/b', lang: 'ar', inApp: true },
] as const;
/** The browser reports the page's own 404 as a console error; that one is the point, not a fault. */
const realErrors = (errors: string[]) => errors.filter((e) => !/the server responded with a status of 404/.test(e));

for (const m of MISSING) {
  for (const w of WIDTHS) {
    test(`public site: not found ${m.path} at ${w.name}`, async ({ page, baseURL }) => {
      const seen = watch(page, baseURL!);
      const failed: string[] = [];
      page.on('response', (r) => r.request().resourceType() !== 'document' && r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
      await page.setViewportSize({ width: w.width, height: w.height });
      const response = await page.goto(m.path);
      expect(response?.status(), 'a real 404, not a redirect and not a 200').toBe(404);
      expect(new URL(page.url()).pathname, 'the address stays as asked').toBe(m.path);
      await page.waitForLoadState('networkidle');
      const f = await facts(page);
      const c = CATALOGUE[m.lang];
      const head = await page.evaluate(() => ({
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
        canonical: document.querySelectorAll('link[rel="canonical"]').length,
        h1: document.querySelector('h1')?.textContent,
        styled: getComputedStyle(document.querySelector('.nf-hero')!).paddingTop !== '0px',
        inAppFrame: !!document.querySelector('.in-app-header'),
        publicNav: !!document.querySelector('.nav-wide, .footer-grid'),
        primary: document.querySelector('.nf-copy .btn-primary')?.getAttribute('href'),
        secondary: document.querySelector('.nf-copy .btn-ghost')?.getAttribute('href') ?? null,
      }));
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: shot(`not-found-${w.name}`, m.lang, m.path.replace(/\//g, '_')), fullPage: true, type: 'jpeg', quality: 70 });
      let overflow320 = 0;
      if (w.width === 375) {
        await page.setViewportSize({ width: 320, height: 720 });
        overflow320 = (await facts(page)).overflow;
      }
      record(`not-found-${w.name}-${m.path}`, { ...m, width: w.width, overflow: f.overflow, overflow320, failed, errors: seen.errors, head });
      expect(f.lang).toBe(m.lang);
      expect(f.dir).toBe(m.lang === 'ar' ? 'rtl' : 'ltr');
      expect(f.h1).toBe(1);
      expect(head.h1).toBe(c['notFound.title']);
      expect(head.robots).toBe('noindex, nofollow');
      expect(head.canonical).toBe(0);
      expect(head.styled, 'the stylesheet loaded at this depth').toBe(true);
      expect(failed, 'every file loads from a nested address').toEqual([]);
      expect(f.overflow).toBeLessThanOrEqual(0);
      expect(overflow320, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
      expect(seen.foreign).toEqual([]);
      expect(realErrors(seen.errors), 'no script error, no hydration mismatch').toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      if (m.inApp) {
        // The app's frame: its pages only — no home, product, contact, sign-in or site navigation.
        expect(head.inAppFrame && !head.publicNav).toBe(true);
        expect(head.primary).toBe(inAppPathOf('support', m.lang));
        expect(f.links.filter((h) => !h.startsWith('#') && !h.includes('/in-app/'))).toEqual([]);
      } else {
        expect(head.inAppFrame).toBe(false);
        expect(head.primary).toBe(pathOf('home', m.lang));
        expect(head.secondary).toBe(pathOf('contact', m.lang));
        expect(f.links.filter((h) => ACCOUNT_LINK.test(h))).toEqual([]);
      }
    });
  }
}

test('public site: not found — nothing from the address is shown back, and it is not in the sitemap', async ({ page, request }) => {
  const response = await page.goto('/missing-page-zz9?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E#frag');
  expect(response?.status()).toBe(404);
  const text = (await facts(page)).text;
  expect(text).not.toMatch(/missing-page-zz9|alert\(1\)|<script/);
  expect(await page.locator('script:not([src]):not([type="application/ld+json"])').count()).toBe(0);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toMatch(/404|in-app/);
});

test('public site: not found — after a link inside the site the router shows the same page, never indexed', async ({ page }) => {
  await page.goto(pathOf('about', 'fr'));
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    history.pushState({}, '', '/fr/plus-rien');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('h1')).toHaveText(fr['notFound.title']);
  const head = await page.evaluate(() => ({
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
  }));
  expect(head).toEqual({ title: `${fr['notFound.title']} — TSX-MR`, robots: 'noindex, nofollow', canonical: 0, alternates: 0 });
  // Back to the home page in the same language, by the router.
  await page.locator('.nf-copy .btn-primary').click();
  await expect(page).toHaveURL(/\/fr$/);
});

test('public site: not found — a language choice leads to that language’s home once, and a stored choice never redirects a 404', async ({ page }) => {
  await page.goto('/deep/missing/path');
  await page.locator('.languages-wide a[hreflang="ar"]').click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // Arabic is now the stored choice; an unknown English address stays where it is, a 404 in English.
  const again = await page.goto('/still/missing');
  expect(again?.status()).toBe(404);
  await page.waitForLoadState('networkidle');
  expect(new URL(page.url()).pathname).toBe('/still/missing');
  await expect(page.locator('h1')).toHaveText(en['notFound.title']);
});

test('public site: not found — the chosen theme carries over, and the page reads in both', async ({ page }) => {
  await page.goto('/');
  const start = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('.theme-toggle').click();
  const chosen = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(chosen).not.toBe(start);
  await page.goto('/x/y');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(chosen);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

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
