import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { pathOf, PUBLIC_ROUTES } from '../src/site/routes';
import { BRANCHES, LINES, subscription } from '../test/fixtures-data';

/**
 * The built site in a real browser (docs/74 §9): every public page in every language, at a desktop width and at
 * 375 px, with the host's real headers and Content Security Policy. Screenshots, the accessibility audit and every
 * measured fact go to the evidence directory. Protected pages are shown signed out and with mock data (the
 * component tests' fixtures) — no real account, no password, no token.
 */
const EV = process.env.EV ?? 'e2e-output';
const LANGS = ['en', 'fr', 'ar'] as const;
const API = 'http://127.0.0.1:3999/api/v1';
const PLAN = { version: 3, branchMonthly: 500, agentMonthly: 300, bothMonthly: 700, includedSeatsPerStore: 1, extraSeatMonthly: 100, currency: 'MRU', effectiveFrom: '2026-10-05T00:00:00.000Z', upcoming: null };

const findings: Record<string, unknown>[] = [];
function record(f: Record<string, unknown>) {
  findings.push(f);
  const file = join(EV, 'browser', `${test.info().titlePath.slice(1).join(' ').replace(/[^\w.-]+/g, '_').slice(0, 150)}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(f, null, 2));
}

/** `fr-home.jpg`, `ar-products-dukan-erp.jpg`: the page without its language prefix, named for the index. */
function shot(variant: string, lang: string, path: string): string {
  const rest = path.replace(/^\/(fr|ar)(?=\/|$)/, '') || '/';
  return join(EV, 'screenshots', variant, `${lang}${rest === '/' ? '-home' : rest.replace(/\//g, '-')}.jpg`);
}

/** The API the pages may call, answered from fixtures: signed out unless a test says otherwise. */
async function mockApi(page: Page, signedIn: { owner?: boolean; admin?: boolean } = {}) {
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.endsWith('/platform/plan')) return json(PLAN);
    if (url.endsWith('/platform/my-subscription')) return signedIn.owner ? json(subscription(BRANCHES, LINES)) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/admin/me')) return signedIn.admin ? json({ id: 'a1', email: 'admin@preview.invalid', name: 'Preview administrator' }) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/dashboard'))
      return json({ byState: { pending: 2, active: 7, grace: 1, complimentary: 3, suspended: 0, expired: 1, cancelled: 0, rejected: 1 }, businesses: 15, branches: 21, activeUsers: 48, pendingSeatRequests: 2, pendingStaff: 1, revenue: null, calculatedAt: '2026-10-12T08:00:00.000Z' });
    if (url.includes('/platform/my-subscription/activity-options')) return json({ stores: [], newStore: [] });
    return json({ message: 'Unauthorized' }, 401);
  });
}

/** Console errors include Content Security Policy refusals; a page may produce none. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of 401/.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function layout(page: Page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    // What sticks out sideways, named, so a failure says where (visible elements only).
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 0.5 || r.left < -0.5);
      })
      .slice(0, 12)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${(el.getAttribute('class') ?? '').split(' ').join('.')} [${Math.round(el.getBoundingClientRect().left)}..${Math.round(el.getBoundingClientRect().right)}]`),
  }));
}

for (const lang of LANGS) {
  for (const route of PUBLIC_ROUTES) {
    const path = pathOf(route.id, lang);
    test(`public ${path} at 375 px`, async ({ page }) => {
      const errors = watchConsole(page);
      await mockApi(page);
      await page.setViewportSize({ width: 375, height: 812 });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      const l = await layout(page);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: shot(`${lang}-375`, lang, path), fullPage: true, type: 'jpeg', quality: 70 });
      await page.setViewportSize({ width: 320, height: 720 });
      const at320 = await layout(page);
      record({ path, lang, width: 375, layout: l, overflow320: at320.overflow, offenders320: at320.offenders, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })) });
      expect(l.lang).toBe(lang);
      expect(l.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      expect(l.h1).toBe(1);
      expect(l.overflow, 'no sideways scroll at 375 px').toBeLessThanOrEqual(0);
      expect(at320.overflow, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
      expect(l.robots).toBe('noindex, nofollow'); // a preview is never indexed
      expect(errors).toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}

for (const route of PUBLIC_ROUTES) {
  const path = pathOf(route.id, 'en');
  test(`public ${path} at desktop, and at 200% text`, async ({ page }) => {
    const errors = watchConsole(page);
    await mockApi(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: shot('en-desktop', 'en', path), fullPage: true, type: 'jpeg', quality: 70 });
    const l = await layout(page);
    // WCAG 1.4.4: the text at 200% (the root font size doubled), nothing cut and nothing scrolling sideways.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const zoomed = await layout(page);
    await page.screenshot({ path: shot('en-desktop-200pct', 'en', path), fullPage: false, type: 'jpeg', quality: 60 });
    record({ path, width: 1280, layout: l, overflowAt200: zoomed.overflow, consoleErrors: errors });
    expect(l.overflow).toBeLessThanOrEqual(0);
    expect(zoomed.overflow, 'no sideways scroll at 200% text').toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('keyboard: the skip link comes first and lands on the main content; the phone menu opens from the keyboard', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => ({ cls: document.activeElement?.className, href: document.activeElement?.getAttribute('href') }));
  expect(first).toEqual({ cls: 'skip-link', href: '#main' });
  await expect(page.locator('a.skip-link')).toBeVisible();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => location.hash)).toBe('#main');
  const summary = page.locator('details.menu > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details.menu .nav-narrow a').first()).toBeVisible();
  await page.screenshot({ path: shot('keyboard', 'en', '/menu-open'), type: 'jpeg', quality: 70 });
  const focusVisible = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  record({ test: 'keyboard', first, focusOutline: focusVisible });
  expect(focusVisible).not.toBe('none');
});

test('without JavaScript, a prerendered page is whole and its phone menu still opens', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/ar/products/dukan-erp');
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir])).toEqual(['ar', 'rtl']);
  await expect(page.locator('h1')).toHaveCount(1);
  await page.locator('details.menu > summary').click();
  await expect(page.locator('details.menu .nav-narrow a').first()).toBeVisible();
  await page.screenshot({ path: shot('no-js', 'ar', '/products/dukan-erp'), fullPage: true, type: 'jpeg', quality: 70 });
  await context.close();
});

test('a table-of-contents link lands below the sticky header, not behind it', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/privacy');
  await page.locator('.toc a').nth(8).click();
  const gap = await page.evaluate(() => {
    const header = document.querySelector('.chrome-header')!.getBoundingClientRect();
    const target = document.querySelector(location.hash)!.getBoundingClientRect();
    return target.top - header.bottom;
  });
  record({ test: 'anchor-under-header', gap });
  expect(gap).toBeGreaterThanOrEqual(0);
});

test('the host files: robots, sitemap, security headers, protected areas noindex, unknown address 404', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  const home = await request.get('/');
  const account = await request.get('/account');
  const admin = await request.get('/admin/businesses');
  const missing = await request.get('/no-such-page');
  const csp = home.headers()['content-security-policy'] ?? '';
  record({ robots, csp, homeHeaders: home.headers(), accountRobots: account.headers()['x-robots-tag'], adminRobots: admin.headers()['x-robots-tag'], missingStatus: missing.status() });
  expect(robots).toBe('User-agent: *\nDisallow: /\n');
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-inline');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(account.status()).toBe(200);
  expect(account.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(admin.headers()['x-robots-tag']).toBe('noindex, nofollow');
  // The protected shell carries no prerendered content and no business data.
  expect(await account.text()).not.toMatch(/<h1|Dukan ERP est|platform\/dashboard/);
  expect(missing.status()).toBe(404);
});

const PROTECTED: [string, string, { owner?: boolean; admin?: boolean }, number][] = [
  ['account-signed-out', '/account', {}, 1280],
  ['account-signed-in', '/account', { owner: true }, 1280],
  ['account-signed-in-375', '/account', { owner: true }, 375],
  ['admin-sign-in', '/admin', {}, 1280],
  ['admin-dashboard', '/admin', { admin: true }, 1280],
  ['admin-dashboard-375', '/admin', { admin: true }, 375],
];
for (const [name, path, signedIn, width] of PROTECTED) {
  test(`protected: ${name} (mock data, noindex)`, async ({ page }) => {
    const errors = watchConsole(page);
    await mockApi(page, signedIn);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(EV, 'screenshots', 'protected', `${name}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
    const l = await layout(page);
    record({ name, path, layout: l, consoleErrors: errors });
    expect(l.robots).toBe('noindex, nofollow');
    expect(l.overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}
