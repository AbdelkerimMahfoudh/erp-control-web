import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';
import { IN_APP_ROUTE_IDS, inAppPathOf, pathOf, publicRoutesFor } from '../src/site/routes';
import { DEMO_FIGURES, dukanDemo } from '../src/content/dukan-demo';
import { formatMru } from '../src/lib/format';

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

/**
 * Scrolls through the page once, as a reader would, so every card has been reached and has appeared (lib/reveal.ts) —
 * a full-page screenshot does not scroll, and would show the cards not yet reached as the empty space they wait in.
 */
async function reachAll(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(window.innerHeight * 0.8)) {
      window.scrollTo(0, y);
      await frame();
    }
    window.scrollTo(0, 0);
    await frame();
  });
  await page.waitForTimeout(1000);
}

/**
 * Nothing is on sale before launch (docs/96 §2): the page's words outside the Dukan ERP showcase name no amount, and the
 * showcase's own amounts are its walkthrough's three fictional figures, under the words that say so.
 */
async function priceFacts(page: Page) {
  return page.evaluate(() => {
    const rest = document.body.cloneNode(true) as HTMLElement;
    rest.querySelectorAll('.showcase').forEach((el) => el.remove());
    const showcase = document.querySelector('.showcase');
    const amounts = showcase ? [...showcase.querySelectorAll('.sc-frames bdi')].map((b) => b.textContent ?? '').filter((t) => t.includes('MRU')) : [];
    return {
      rest: rest.textContent ?? '',
      amounts: [...new Set(amounts)].sort(),
      isolated: amounts.length === (showcase?.textContent ?? '').split('MRU').length - 1,
      note: showcase?.querySelector('.sc-note')?.textContent ?? null,
    };
  });
}
const demoAmounts = (lang: (typeof LANGS)[number]) => [DEMO_FIGURES.salePrice, DEMO_FIGURES.exchangeAmount, DEMO_FIGURES.commission].map((n) => formatMru(n, lang)).sort();

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
        await reachAll(page);
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
      expect(f.text).not.toMatch(/\b7-day\b|essai gratuit|تجربة مجانية/);
      const p = await priceFacts(page);
      // A whole word: the footer's "TSX-MR" runs into the next line's first letter in `textContent`.
      expect(p.rest).not.toMatch(/\bMRU\b/);
      expect({ id, amounts: p.amounts, isolated: p.isolated, note: p.note }).toEqual({ id, amounts: demoAmounts(lang), isolated: true, note: dukanDemo[lang].note });
    }
  });

  test(`public site: who operates it, said plainly in ${lang} — an individual, no company, nothing invented`, async ({ page }) => {
    const c = CATALOGUE[lang];
    const NAME = 'Abdel Kerim Taleb Ould Sidi';
    // The legal notice says who operates TSX-MR and who is responsible for publication — the only page that names the
    // person twice; every other legal text names them once, and the brand's own pages not at all.
    await page.goto(pathOf('legalNotice', lang));
    const notice = (await facts(page)).text;
    expect(notice).toContain(c['org.statusIndividual']);
    expect(notice.split(NAME).length - 1).toBe(2);
    expect(notice).not.toContain(c['org.legalForm']);
    expect(notice).not.toContain(c['org.registration']);
    for (const id of ['home', 'services', 'about', 'contact', 'products', 'dukanErp'] as const) {
      await page.goto(pathOf(id, lang));
      const text = (await facts(page)).text;
      expect({ id, named: text.includes(NAME) }).toEqual({ id, named: false });
      expect({ id, html: (await page.content()).includes(NAME) }).toEqual({ id, html: false });
      expect(text).not.toContain(c['org.legalForm']);
    }
    // The footer of every page describes the brand in one line, with no name.
    expect(await page.locator('.chrome-footer').textContent()).toContain(c['footer.brand']);
    await page.goto(pathOf('legalNotice', lang));
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
      const style = (e: Element) => ({ shadow: getComputedStyle(e).boxShadow, translate: getComputedStyle(e).translate, edge: getComputedStyle(e).borderTopColor, cursor: getComputedStyle(e).cursor, tab: e.getAttribute('tabindex') });
      const rest = await card.evaluate(style);
      expect(rest.shadow).not.toBe('none');
      // An informational card: no pointer and no tab stop of its own.
      expect({ cursor: rest.cursor, tab: rest.tab }).toEqual({ cursor: 'auto', tab: null });
      await card.hover();
      await page.waitForTimeout(400);
      const hover = await card.evaluate(style);
      expect(hover.shadow).not.toBe(rest.shadow);
      expect(hover.edge).not.toBe(rest.edge);
      if (reducedMotion === 'reduce') expect(hover.translate === 'none' || hover.translate === '0px').toBe(true);
      else expect(hover.translate).toBe('0px -4px');
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
      expect(await codes.evaluateAll((as) => as.map((a) => a.getAttribute('aria-label')))).toEqual(['EN, English', 'FR, Français', 'AR, العربية']);
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

  test(`public site: a link opens its page at the top, focus in its content; Back and Forward return (${lang})`, async ({ page }) => {
    // The owner's brief of 2026-10-17, fourth: footer and quick links used to open their destination near its bottom.
    const atTop = () =>
      page.evaluate(() => {
        const header = document.querySelector('.chrome-header')!.getBoundingClientRect();
        const h1 = document.querySelector('main h1')!;
        return { y: window.scrollY, below: h1.getBoundingClientRect().top >= header.bottom - 1, focus: document.activeElement === h1 };
      });
    const toBottom = () => page.evaluate(() => (window.scrollTo(0, document.documentElement.scrollHeight), window.scrollY));
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      for (const [from, link, to] of [
        ['privacy', `.chrome-footer a[href="${pathOf('about', lang)}"]`, 'about'],
        ['terms', `.legal-related a[href="${pathOf('legalNotice', lang)}"]`, 'legalNotice'],
        ['contact', `.legal-related a[href="${pathOf('privacy', lang)}"]`, 'privacy'],
        ['dukanErp', `.chrome-footer a[href="${pathOf('services', lang)}"]`, 'services'],
      ] as const) {
        await page.goto(pathOf(from, lang));
        await toBottom();
        // As far down as the link allows: at the very bottom, or with the link on the last line of the screen (on a
        // phone the quick links sit above a tall footer), so the click does not move the page first.
        const left = await page.locator(link).evaluate((a) => {
          if (a.getBoundingClientRect().bottom > window.innerHeight) a.scrollIntoView({ block: 'end' });
          return window.scrollY;
        });
        expect(left, `${from} is long enough to test from its bottom`).toBeGreaterThan(300);
        // A click from where the reader is: Playwright's own click would first scroll the link to where it prefers.
        await page.locator(link).evaluate((a: HTMLElement) => a.click());
        await expect(page).toHaveURL(new RegExp(`${pathOf(to, lang)}$`));
        // The address changes a moment before the new page is drawn; wait for the page, never a fixed delay.
        await expect.poll(() => atTop()).toEqual({ y: 0, below: true, focus: true });
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`${pathOf(from, lang)}$`));
        await expect.poll(() => page.evaluate(() => window.scrollY), { message: `${from} at ${width} px: Back returns to ${left}` }).toBe(left);
        await page.goForward();
        await expect(page).toHaveURL(new RegExp(`${pathOf(to, lang)}$`));
        await expect.poll(() => page.evaluate(() => window.scrollY), { message: `${to} at ${width} px: Forward returns to the top` }).toBe(0);
      }
      // The phone menu, used from the bottom of a page: the new page's heading takes focus, not the menu button.
      if (width === 375) {
        await page.goto(pathOf('privacy', lang));
        await toBottom();
        await page.locator('.chrome-header button.menu-button').click();
        await page.locator(`#site-menu .nav a[href="${pathOf('about', lang)}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${pathOf('about', lang)}$`));
        await expect.poll(() => atTop()).toEqual({ y: 0, below: true, focus: true });
        await expect(page.locator('.chrome-header button.menu-button')).toHaveAttribute('aria-expanded', 'false');
      }
    }
    // A section link still lands on its section, below the header, with focus on it; Back returns to where it was.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pathOf('privacy', lang));
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('nav.toc a.toc-link').nth(6).click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id === location.hash.slice(1))).toBe(true);
    const landed = await page.evaluate(() => {
      const header = document.querySelector('.chrome-header')!.getBoundingClientRect();
      const section = document.getElementById(location.hash.slice(1))!;
      return { hash: !!location.hash, gap: section.querySelector('h2')!.getBoundingClientRect().top - header.bottom, focus: document.activeElement === section };
    });
    expect(landed.hash && landed.focus && landed.gap >= 0 && landed.gap < 120).toBe(true);
    await page.goBack();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
    // A language switched from the bottom of a page: the page in the other language, from its top (the documented policy).
    const other = lang === 'fr' ? 'ar' : 'fr';
    await page.goto(pathOf('terms', lang));
    await toBottom();
    await page.locator(`.languages-wide a[lang="${other}"]`).evaluate((a: HTMLElement) => a.click());
    await expect(page).toHaveURL(new RegExp(`${pathOf('terms', other)}$`));
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(other);
    await expect.poll(() => atTop()).toEqual({ y: 0, below: true, focus: true });
  });

  test(`public site: every link stays a real link — a new tab, and a page without a script (${lang})`, async ({ page, context, browser }) => {
    await page.goto(pathOf('privacy', lang));
    const footerAbout = page.locator(`.chrome-footer a[href="${pathOf('about', lang)}"]`);
    const [opened] = await Promise.all([context.waitForEvent('page'), footerAbout.click({ modifiers: ['ControlOrMeta'] })]);
    await opened.waitForURL(new RegExp(`${pathOf('about', lang)}$`));
    expect(new URL(opened.url()).pathname).toBe(pathOf('about', lang));
    expect(new URL(page.url()).pathname).toBe(pathOf('privacy', lang));
    await opened.close();
    const plain = await browser.newContext({ javaScriptEnabled: false, baseURL: new URL(page.url()).origin });
    const noScript = await plain.newPage();
    await noScript.goto(pathOf('terms', lang));
    await noScript.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await noScript.locator(`.legal-related a[href="${pathOf('privacy', lang)}"]`).click();
    await expect(noScript).toHaveURL(new RegExp(`${pathOf('privacy', lang)}$`));
    expect(await noScript.evaluate(() => window.scrollY)).toBe(0);
    await plain.close();
  });

  test(`public site: the language control is three equal segments everywhere, each filled the same way (${lang})`, async ({ page }) => {
    /** Each segment: its box, the filled area inside it (the content box) and where its label's glyphs sit. */
    const measure = (selector: string) =>
      page.$$eval(selector, (as) =>
        as.map((a) => {
          const box = a.getBoundingClientRect();
          const cs = getComputedStyle(a);
          const range = document.createRange();
          range.selectNodeContents(a);
          const glyphs = range.getBoundingClientRect();
          const fill = { left: box.left + parseFloat(cs.paddingLeft), right: box.right - parseFloat(cs.paddingRight), top: box.top + parseFloat(cs.paddingTop), bottom: box.bottom - parseFloat(cs.paddingBottom) };
          return { width: box.width, height: box.height, fillWidth: fill.right - fill.left, fillHeight: fill.bottom - fill.top, fill, centreOffset: (glyphs.left + glyphs.right) / 2 - (box.left + box.right) / 2, current: a.getAttribute('aria-current') === 'true', label: a.getAttribute('aria-label') };
        }),
      );
    const check = async (where: string, selector: string, list: string) => {
      const segs = await measure(selector);
      expect(segs.length, where).toBe(3);
      for (const s of segs) {
        expect(s.height, `${where}: a 44 px target`).toBeGreaterThanOrEqual(44);
        expect(Math.abs(s.width - segs[0]!.width), `${where}: equal segments`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(s.centreOffset), `${where}: the label centred`).toBeLessThanOrEqual(1);
      }
      expect(segs.map((s) => s.label)).toEqual(['EN, English', 'FR, Français', 'AR, العربية']);
      expect(segs.filter((s) => s.current)).toHaveLength(1);
      // The same inset at both ends and between segments.
      const outer = await page.$eval(list, (ul) => ul.getBoundingClientRect());
      const fills = segs.map((s) => s.fill).sort((a, b) => a.left - b.left);
      const insets = [fills[0]!.left - outer.left, fills[1]!.left - fills[0]!.right, fills[2]!.left - fills[1]!.right, outer.right - fills[2]!.right, fills[0]!.top - outer.top, outer.bottom - fills[0]!.bottom];
      for (const inset of insets) expect(Math.abs(inset - insets[0]!), `${where}: equal insets ${insets.join(', ')}`).toBeLessThanOrEqual(0.5);
      return segs.find((s) => s.current)!;
    };
    const filled: Record<string, { fillWidth: number; fillHeight: number }[]> = { wide: [], narrow: [], app: [] };
    for (const current of LANGS) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(pathOf('privacy', current));
      filled.wide!.push(await check(`wide ${current}`, '.languages-wide a', '.languages-wide'));
      await page.goto(inAppPathOf('privacy', current));
      filled.app!.push(await check(`app ${current}`, '.in-app-header .languages a', '.in-app-header .languages'));
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(pathOf('privacy', current));
      await page.locator('.chrome-header button.menu-button').click();
      filled.narrow!.push(await check(`narrow ${current}`, '#site-menu .languages a', '#site-menu .languages'));
      if (current === lang) await page.locator('#site-menu .languages').screenshot({ path: shot('selector-narrow', lang, pathOf('privacy', lang)) });
    }
    // EN, FR and AR selected: the filled background has the same size every time.
    for (const [where, fills] of Object.entries(filled)) {
      for (const f of fills) expect({ where, w: Math.round(f.fillWidth * 2) / 2, h: Math.round(f.fillHeight * 2) / 2 }).toEqual({ where, w: Math.round(fills[0]!.fillWidth * 2) / 2, h: Math.round(fills[0]!.fillHeight * 2) / 2 });
    }
  });

  test(`public site: one group of quick links per page, the current page shown as text (${lang})`, async ({ page }) => {
    for (const id of ['privacy', 'terms', 'accountDeletion', 'privacyChoices', 'legalNotice', 'security', 'support', 'contact'] as const) {
      await page.goto(pathOf(id, lang));
      const f = await page.evaluate((here) => {
        const main = document.querySelector('main')!;
        const groups = main.querySelectorAll('.legal-links');
        const related = main.querySelector('.legal-related');
        const headings = [...main.querySelectorAll('h2')].map((h) => h.textContent?.trim());
        return {
          groups: groups.length,
          last: related === main.querySelector('article')?.lastElementChild || related === main.lastElementChild?.lastElementChild,
          current: related?.querySelector('[aria-current="page"]')?.tagName ?? null,
          selfLink: !!related?.querySelector(`a[href="${here}"]`),
          links: related?.querySelectorAll('a').length ?? 0,
          repeatedHeading: headings.some((h, i) => i > 0 && h === headings[i - 1]),
        };
      }, pathOf(id, lang));
      const policy = id !== 'contact';
      expect({ id, ...f }).toEqual({ id, groups: 1, last: true, current: policy ? 'SPAN' : null, selfLink: false, links: policy ? 6 : 7, repeatedHeading: false });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pathOf('legalNotice', lang));
    await page.locator('.legal-related').screenshot({ path: shot('legal-nav', lang, pathOf('legalNotice', lang)) });
    // The pages the app opens: their footer is the only list, legal pages only.
    await page.goto(inAppPathOf('terms', lang));
    expect(await page.locator('main .legal-links').count()).toBe(0);
    expect(await page.locator('.in-app-footer .legal-links').count()).toBe(1);
    expect(await page.locator('.in-app-footer [aria-current="page"]').evaluate((el) => el.tagName)).toBe('SPAN');
  });

  test(`public site: the brand pages fit 320 and 375 px, in light and dark (${lang})`, async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      for (const width of [320, 375]) {
        await page.setViewportSize({ width, height: 800 });
        for (const id of ['home', 'services', 'products', 'about', 'contact', 'dukanErp'] as const) {
          await page.goto(pathOf(id, lang));
          expect({ id, width, theme, overflow: (await facts(page)).overflow }).toEqual({ id, width, theme, overflow: 0 });
        }
      }
    }
  });

  // The Dukan ERP showcase (the owner's approval of 2026-10-18).
  test(`public site: the Dukan showcase in ${lang} — two equal tabs, six steps, one height, whole from 320 px, nothing sent or kept`, async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    const d = dukanDemo[lang];
    const seen = watch(page, baseURL!);
    for (const width of [320, 375, 393, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['home', 'dukanErp'] as const) {
        await page.goto(pathOf(id, lang));
        const kept = () => page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]));
        const before = await kept();
        const showcase = page.locator('.showcase');
        await showcase.scrollIntoViewIfNeeded();
        const tabs = showcase.locator('[role="tab"]');
        await expect(tabs).toHaveText([d.electronics.tab, d.agent.tab]);
        const sizes = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: Math.round(r.width), h: Math.round(r.height) })));
        expect({ width, id, same: sizes[0]!.w === sizes[1]!.w && sizes[0]!.h === sizes[1]!.h, tall: sizes.every((b) => b.h >= 44) }).toEqual({ width, id, same: true, tall: true });
        const heights = new Set<number>();
        for (const i of [0, 1]) {
          await tabs.nth(i).click();
          const panel = showcase.locator('.sc-panel[data-on="true"]');
          const steps = panel.locator('.sc-step button');
          const states = i === 1 ? [0, 1, 2, 'giveCash', 0, 1, 2, 'receiveCash'] : [0, 1, 2];
          for (const state of states) {
            if (typeof state === 'number') {
              await steps.nth(state).click();
              await expect(steps.nth(state)).toHaveAttribute('aria-current', 'step');
            } else await panel.locator('.sc-direction-choice').nth(state === 'giveCash' ? 1 : 0).click();
            heights.add(Math.round((await showcase.boundingBox())!.height));
            const geo = await showcase.evaluate((el) => {
              const box = el.getBoundingClientRect();
              const outside = [...el.querySelectorAll('.sc-panel[data-on="true"] *, .sc-tabs *')].filter((n) => {
                const r = n.getBoundingClientRect();
                return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1);
              });
              // Every control is at least a comfortable touch target.
              const small = [...el.querySelectorAll('.sc-panel[data-on="true"] :is(.sc-step, .sc-direction-choice), .sc-tab')]
                .map((n) => n.getBoundingClientRect())
                .filter((r) => r.height < 44 || r.width < 44);
              return { overflow: document.documentElement.scrollWidth - window.innerWidth, outside: outside.length, small: small.length };
            });
            expect({ width, id, state, ...geo }).toEqual({ width, id, state, overflow: 0, outside: 0, small: 0 });
          }
        }
        expect({ width, id, heights: heights.size }, 'the showcase keeps one height whatever it shows').toEqual({ width, id, heights: 1 });
        expect(await kept()).toBe(before);
      }
    }
    expect(seen.foreign, 'no request to any other origin').toEqual([]);
    expect(seen.errors).toEqual([]);
  });

  test(`public site: the showcase by keyboard in ${lang} — arrows in the page's direction, focus always visible, never in the hidden panel`, async ({ page }) => {
    const d = dukanDemo[lang];
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(pathOf('dukanErp', lang));
    const showcase = page.locator('.showcase');
    await showcase.scrollIntoViewIfNeeded();
    await showcase.locator('[role="tab"][aria-selected="true"]').focus();
    await page.keyboard.press(lang === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.locator(':focus')).toHaveText(d.agent.tab);
    await expect(page.locator(':focus')).toHaveAttribute('aria-selected', 'true');
    // Tab walks the open panel only: play, the two directions, the three steps, then out of the showcase.
    const walked: { panel: string | null; on: string | null; ring: string }[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      walked.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const card = el.closest('.sc-step') ?? el;
          return { panel: el.closest('[role="tabpanel"]')?.id ?? null, on: el.closest('[role="tabpanel"]')?.getAttribute('data-on') ?? null, ring: getComputedStyle(card).outlineStyle };
        }),
      );
    }
    expect(walked.every((w) => w.on === 'true')).toBe(true);
    expect(walked.every((w) => w.ring !== 'none')).toBe(true);
    await page.keyboard.press('Enter');
    await expect(showcase.locator('.sc-panel[data-on="true"] .sc-step button').nth(2)).toHaveAttribute('aria-current', 'step');
    await expect(showcase.locator('.sc-panel[data-on="true"] .sc-frame[data-on="true"]')).toContainText(d.agent.recorded);
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

const EN = dukanDemo.en;
const showcaseStep = (page: Page) =>
  page.locator('.showcase .sc-panel[data-on="true"] .sc-step button').evaluateAll((buttons) => buttons.findIndex((b) => b.getAttribute('aria-current') === 'step'));

test('public site: the walkthrough plays once when asked, about 2.8 s a step, and pauses off screen or in a hidden tab', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(pathOf('dukanErp', 'en'));
  const showcase = page.locator('.showcase');
  await showcase.scrollIntoViewIfNeeded();
  const play = showcase.locator('.sc-panel[data-on="true"] .sc-play');
  // Nothing moves by itself.
  await page.waitForTimeout(3200);
  expect(await showcase.evaluate((el) => el.querySelector('.sc-step[data-playing]'))).toBeNull();
  expect(await showcaseStep(page)).toBe(0);
  // Play: once through, about 2.8 s a step, stopping on the result.
  const started = Date.now();
  await play.click();
  await expect(play).toHaveText(EN.pause);
  await expect.poll(() => showcaseStep(page), { timeout: 4000, intervals: [50] }).toBe(1);
  const first = Date.now() - started;
  await expect.poll(() => showcaseStep(page), { timeout: 4000, intervals: [50] }).toBe(2);
  const second = Date.now() - started - first;
  for (const ms of [first, second]) expect(ms > 2500 && ms < 3300, `a step lasted ${ms} ms`).toBe(true);
  await expect(play).toHaveText(EN.replay);
  await page.waitForTimeout(3200);
  expect(await showcaseStep(page)).toBe(2);
  // However often it is started and stopped, one timer: the next step still takes a whole step.
  await play.click();
  for (let i = 0; i < 4; i++) await play.click();
  await expect(play).toHaveText(EN.pause);
  const restarted = Date.now();
  await expect.poll(() => showcaseStep(page), { timeout: 4000, intervals: [50] }).toBe(1);
  expect(Date.now() - restarted).toBeGreaterThan(2500);
  // Scrolled out of sight, it pauses, and does not start again when it comes back.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3500);
  await showcase.scrollIntoViewIfNeeded();
  await expect(play).toHaveText(EN.play);
  expect(await showcaseStep(page)).toBe(1);
  await page.waitForTimeout(3200);
  expect(await showcaseStep(page)).toBe(1);
  // A hidden tab pauses it the same way.
  await play.click();
  await expect(play).toHaveText(EN.pause);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(play).toHaveText(EN.play);
  await page.waitForTimeout(3200);
  expect(await showcaseStep(page)).toBe(1);
  // Switching activity or direction stops it and starts the walkthrough again.
  await play.click();
  await showcase.locator('[role="tab"]').nth(1).click();
  expect(await showcaseStep(page)).toBe(0);
  await expect(showcase.locator('.sc-panel[data-on="true"] .sc-play')).toHaveText(EN.play);
});

/** The colour a stylesheet token resolves to, as the browser computes a colour. */
const tokenColour = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, token);

test('public site: cards appear once as they are reached, in the Balanced values; they rise on hover and focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(pathOf('dukanErp', 'en'));
  await page.waitForTimeout(300);
  const cards = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-reveal]')].map((e) => ({
        top: Math.round(e.getBoundingClientRect().top + window.scrollY),
        in: e.classList.contains('in'),
        opacity: getComputedStyle(e).opacity,
        transform: getComputedStyle(e).transform,
        order: e.getAttribute('data-reveal-order'),
      })),
    );
  const atLoad = await cards();
  expect(await page.evaluate(() => document.documentElement.classList.contains('reveal-ready'))).toBe(true);
  // What the screen showed at first paint was never hidden; what is further down waits, lowered and transparent.
  for (const c of atLoad.filter((c) => c.top < 900)) expect(c).toMatchObject({ in: true, opacity: '1' });
  const waiting = atLoad.filter((c) => c.top >= 900);
  expect(waiting.length).toBeGreaterThan(5);
  for (const c of waiting) expect(c).toMatchObject({ in: false, opacity: '0', transform: 'matrix(1, 0, 0, 1, 0, 18)' });
  const card = page.locator('.problem-grid > li').first();
  const transition = await card.evaluate((e) => getComputedStyle(e).transition);
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.evaluate((e) => getComputedStyle(e).opacity), { timeout: 2000 }).toBe('1');
  await expect.poll(() => card.evaluate((e) => getComputedStyle(e).transform), { timeout: 2000 }).toBe('none');
  // The entrance in the Balanced values, the stagger capped at four steps.
  const entered = await card.evaluate((e) => getComputedStyle(e).transition);
  expect(entered).toContain('opacity 0.65s cubic-bezier(0.2, 0.75, 0.25, 1)');
  expect(entered).toContain('transform 0.65s cubic-bezier(0.2, 0.75, 0.25, 1)');
  expect(entered).toContain('translate 0.21s');
  expect(transition).not.toContain('opacity 0.65s');
  const group = await page.evaluate(() => [...document.querySelectorAll('.problem-grid > li')].map((e) => [e.getAttribute('data-reveal-order'), getComputedStyle(e).transitionDelay.split(',')[0]]));
  expect(group).toEqual([
    ['0', '0s'],
    ['1', '0.075s'],
    ['2', '0.15s'],
    ['3', '0.225s'],
    ['4', '0.3s'],
  ]);
  // Once: back up and down again, it stays.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await card.scrollIntoViewIfNeeded();
  expect(await card.evaluate((e) => [e.classList.contains('in'), getComputedStyle(e).opacity])).toEqual([true, '1']);
  // Hover: 4 px higher, a stronger shadow and the brand edge; an informational card gets no pointer and no tab stop.
  await page.waitForTimeout(800);
  const rest = await card.evaluate((e) => ({ shadow: getComputedStyle(e).boxShadow, edge: getComputedStyle(e).borderTopColor, cursor: getComputedStyle(e).cursor, tab: e.getAttribute('tabindex') }));
  await card.hover();
  await page.waitForTimeout(400);
  const hover = await card.evaluate((e) => ({ translate: getComputedStyle(e).translate, shadow: getComputedStyle(e).boxShadow, edge: getComputedStyle(e).borderTopColor }));
  expect(hover.translate).toBe('0px -4px');
  expect(hover.shadow).not.toBe(rest.shadow);
  expect(hover.edge).toBe(await tokenColour(page, '--border-brand'));
  expect({ cursor: rest.cursor, tab: rest.tab }).toEqual({ cursor: 'auto', tab: null });
  // Focus: a card holding the keyboard focus rises the same way.
  await page.mouse.move(0, 0);
  await page.goto(pathOf('home', 'en'));
  const featured = page.locator('.featured-product');
  await featured.locator('a.btn').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  expect(await featured.evaluate((e) => getComputedStyle(e).translate)).toBe('0px -4px');
});

test('public site: reduced motion, read from the built stylesheet — at load, and switched on while the page is open', async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const motion = (page: Page) =>
    page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
      const root = getComputedStyle(document.documentElement);
      return {
        hidden: cards.filter((c) => getComputedStyle(c).opacity !== '1' || getComputedStyle(c).transform !== 'none').length,
        play: getComputedStyle(document.querySelector('.sc-play')!).display,
        frames: getComputedStyle(document.querySelector('.sc-frame')!).transitionDuration,
        tokens: ['--rise', '--lift', '--stagger'].map((t) => root.getPropertyValue(t).trim()),
      };
    });
  const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 }, baseURL });
  const page = await reduced.newPage();
  await page.goto(pathOf('dukanErp', 'en'));
  await page.waitForTimeout(300);
  expect(await motion(page)).toEqual({ hidden: 0, play: 'none', frames: '0s', tokens: ['0px', '0px', '0s'] });
  // The steps are there, chosen one by one.
  const showcase = page.locator('.showcase');
  await showcase.scrollIntoViewIfNeeded();
  await showcase.locator('.sc-panel[data-on="true"] .sc-step button').nth(2).click();
  await expect(showcase.locator('.sc-panel[data-on="true"] .sc-frame[data-on="true"]')).toContainText(EN.electronics.recorded);
  await reduced.close();

  const open = await browser.newContext({ viewport: { width: 1280, height: 900 }, baseURL });
  const live = await open.newPage();
  await live.goto(pathOf('dukanErp', 'en'));
  await live.waitForTimeout(300);
  const before = await motion(live);
  expect(before.hidden).toBeGreaterThan(0);
  expect(before.play).not.toBe('none');
  const showcaseLive = live.locator('.showcase');
  await showcaseLive.scrollIntoViewIfNeeded();
  await showcaseLive.locator('.sc-panel[data-on="true"] .sc-play').click();
  await live.emulateMedia({ reducedMotion: 'reduce' });
  await live.evaluate(() => window.scrollTo(0, 0));
  expect(await motion(live)).toEqual({ hidden: 0, play: 'none', frames: '0s', tokens: ['0px', '0px', '0s'] });
  await live.waitForTimeout(3500);
  await showcaseLive.scrollIntoViewIfNeeded();
  expect(await showcaseStep(live)).toBe(0);
  await open.close();
});

test('public site: without a script, every card and the first walkthrough are there, at rest', async ({ browser, baseURL }) => {
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 }, baseURL });
  const page = await plain.newPage();
  for (const lang of LANGS) {
    for (const id of ['home', 'dukanErp'] as const) {
      await page.goto(pathOf(id, lang));
      const f = await page.evaluate(() => ({
        ready: document.documentElement.classList.contains('reveal-ready'),
        hidden: [...document.querySelectorAll('[data-reveal]')].filter((c) => getComputedStyle(c).opacity !== '1' || getComputedStyle(c).transform !== 'none').length,
      }));
      expect({ lang, id, ...f }).toEqual({ lang, id, ready: false, hidden: 0 });
      const frame = page.locator('.showcase .sc-panel[data-on="true"] .sc-frame[data-on="true"]');
      await expect(frame).toBeVisible();
      await expect(frame).toContainText(dukanDemo[lang].electronics.product);
      await expect(page.locator('.showcase .sc-note')).toHaveText(dukanDemo[lang].note);
    }
  }
  await plain.close();
});

test('public site: at 200 % zoom the showcase and its pages still fit', async ({ browser, baseURL }) => {
  // A 1280 × 900 window at 200 % is laid out at 640 × 450 CSS pixels.
  const zoomed = await browser.newContext({ viewport: { width: 640, height: 450 }, deviceScaleFactor: 2, baseURL });
  const page = await zoomed.newPage();
  for (const lang of LANGS) {
    for (const id of ['home', 'dukanErp'] as const) {
      await page.goto(pathOf(id, lang));
      const showcase = page.locator('.showcase');
      await showcase.scrollIntoViewIfNeeded();
      await showcase.locator('[role="tab"]').nth(1).click();
      const f = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, right: Math.round(document.querySelector('.showcase')!.getBoundingClientRect().right) }));
      expect({ lang, id, overflow: f.overflow, inside: f.right <= 640 }).toEqual({ lang, id, overflow: 0, inside: true });
    }
  }
  await zoomed.close();
});

test('public site: legal pages, the pages the app opens and the 404 have no entrance and no showcase', async ({ page }) => {
  const paths = [
    ...(['privacy', 'terms', 'accountDeletion', 'privacyChoices', 'legalNotice', 'security', 'support'] as const).map((id) => pathOf(id, 'en')),
    ...IN_APP_ROUTE_IDS.map((id) => inAppPathOf(id, 'ar')),
    '/qx7-missing',
  ];
  for (const path of paths) {
    await page.goto(path);
    const f = await page.evaluate(() => ({ reveal: document.querySelectorAll('[data-reveal]').length, showcase: document.querySelectorAll('.showcase').length }));
    expect({ path, ...f }).toEqual({ path, reveal: 0, showcase: 0 });
  }
});
