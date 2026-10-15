import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { BusinessRow, EntitlementState, SeatRequest, TrialStatus } from '../src/api/types';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { pathOf, PUBLIC_ROUTES } from '../src/site/routes';
import { B1, B2, BRANCHES, LINES, NO_TRIAL, TRIAL_END, TRIAL_START, TRIAL_ZONE, allocation, scheduledRequest, subscription, trialOffer, trialSetup, trialStatus, trialView } from '../test/fixtures-data';

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

/**
 * The free trial's states as the account page meets them (2026-10-13), from the component tests' fixtures: the business
 * state, the Owner's trial read, and the trial the entitlement carries.
 */
const TRIALS: Record<'available' | 'active' | 'paidAfter' | 'expired', TrialStatus> = {
  available: trialStatus({
    setup: trialSetup({
      sentTo: ['email', 'whatsapp'],
      destinations: [
        { channel: 'email', masked: 'o•••@preview.invalid' },
        { channel: 'whatsapp', masked: '+222••••1234' },
      ],
    }),
  }),
  active: { state: 'trial_active', trial: trialView('active'), offer: null, setup: null, calculatedAt: TRIAL_START },
  // Paid access approved during the trial, starting at its end (C6).
  paidAfter: { state: 'trial_active', trial: trialView('active', { accessAfterTrial: { kind: 'paid', startsAt: TRIAL_END } }), offer: null, setup: null, calculatedAt: TRIAL_START },
  expired: { state: 'trial_expired', trial: trialView('expired'), offer: null, setup: null, calculatedAt: TRIAL_END },
};
/**
 * Stores and seats asked for during the trial (D176), as the Owner's list and the console read them: a store and a seat
 * paid for during it, scheduled to its end — or, with no paid access approved yet, to the first paid month — and a
 * seat still awaiting payment.
 */
const BUSINESS = { id: '0192f000-0000-7000-8000-0000000000b1', name: 'Boutique Test', publicStoreId: 'ST-7Q4K' };
function addons(waitsFor: 'trial_end' | 'paid_access'): SeatRequest[] {
  return [
    scheduledRequest('store', {}, { waitsFor }),
    scheduledRequest('seat', {}, { waitsFor }),
    allocation({ id: '0192f000-0000-7000-8000-0000000000d3', kind: 'seat', store: { id: B2, name: 'Boutique Ksar' }, branchId: B2, branchName: 'Boutique Ksar', activityFrom: null, activityTo: null, activityEffective: null, monthlyAmount: 100 }),
  ].map((r) => ({ ...r, business: BUSINESS }));
}
type Session = { owner?: boolean; admin?: boolean; trial?: keyof typeof TRIALS; lang?: 'en' | 'fr' | 'ar'; addons?: 'trial_end' | 'paid_access' };

/** The Owner's account for a business whose trial is `trial`, or the paid business of the other fixtures. */
function ownerAccount(trial: Session['trial']) {
  const sub = subscription(BRANCHES, LINES);
  if (!trial) return sub;
  const status = TRIALS[trial];
  return { ...sub, entitlement: { ...sub.entitlement, state: status.state as EntitlementState, periodEnd: null, trial: status.trial } };
}

/** The API the pages may call, answered from fixtures: signed out unless a test says otherwise. */
async function mockApi(page: Page, signedIn: Session = {}) {
  if (signedIn.lang) await page.addInitScript((lang) => localStorage.setItem('erp.web.language', lang), signedIn.lang);
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.endsWith('/platform/plan')) return json(PLAN);
    if (url.endsWith('/platform/my-subscription')) return signedIn.owner ? json(ownerAccount(signedIn.trial)) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/my-subscription/trial')) return signedIn.owner ? json(signedIn.trial ? TRIALS[signedIn.trial] : NO_TRIAL) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/my-subscription/trial/link')) {
      return signedIn.owner ? json({ link: 'valid', offer: trialOffer(), trial: trialView('available'), state: 'trial_available' }) : json({ message: 'Unauthorized' }, 401);
    }
    if (url.endsWith('/platform/admin/me')) return signedIn.admin ? json({ id: 'a1', email: 'admin@preview.invalid', name: 'Preview administrator' }) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/dashboard'))
      return json({ byState: { pending: 2, active: 7, grace: 1, complimentary: 3, suspended: 0, expired: 1, cancelled: 0, rejected: 1 }, businesses: 15, branches: 21, activeUsers: 48, pendingSeatRequests: 2, pendingStaff: 1, revenue: null, calculatedAt: '2026-10-12T08:00:00.000Z' });
    if (url.includes('/platform/my-subscription/activity-options')) return json({ stores: [], newStore: [] });
    // Stores and seats asked for during the trial (D176): the Owner's list, the console's queue and the business page.
    if (signedIn.addons) {
      const rows = addons(signedIn.addons);
      if (url.endsWith('/platform/my-subscription/seat-requests') && signedIn.owner) return json(rows);
      if (url.includes('/platform/seat-requests?status=') && signedIn.admin) return json(rows.filter((r) => r.status === new URL(url).searchParams.get('status')));
      if (url.endsWith(`/platform/businesses/${BUSINESS.id}/seat-requests`) && signedIn.admin) return json(rows);
      if (url.endsWith(`/platform/businesses/${BUSINESS.id}`) && signedIn.admin) return json(trialBusiness());
    }
    return json({ message: 'Unauthorized' }, 401);
  });
}

/** The console's page for the business whose trial runs, with paid access approved for its end. */
function trialBusiness() {
  const sub = subscription(BRANCHES, LINES);
  return {
    ...BUSINESS,
    city: 'Nouakchott',
    createdAt: '2026-10-12T10:00:00.000Z',
    branches: [
      { id: B1, name: 'Agence Centre', type: 'store', activity: 'money_agent', activityNext: null },
      { id: B2, name: 'Boutique Ksar', type: 'store', activity: 'both', activityNext: null },
    ],
    people: [],
    entitlement: { ...sub.entitlement, state: 'trial_active', status: 'pending_activation', periodEnd: '2026-11-20T09:30:00.000Z', trial: TRIALS.paidAfter.trial },
    pricing: sub.pricing,
    version: 4,
    events: [],
    payments: [],
    trial: {
      eligibility: { registrationMethod: 'email', createdAt: '2026-10-12T10:00:00.000Z', closedAt: '2026-10-14T08:00:00.000Z', closedReason: 'approved' },
      claim: { claimedAt: TRIAL_START, startedAt: TRIAL_START, endsAt: TRIAL_END, expiryRecordedAt: null },
      timeZone: TRIAL_ZONE,
    },
  };
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

/** One region of the full-page render — no sticky header stitched across it, as an element screenshot taller than the window has. */
async function shotOf(page: Page, selector: string, path: string) {
  const clip = await page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  });
  await page.screenshot({ path, fullPage: true, clip, type: 'jpeg', quality: 80 });
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
  const landing = await request.get('/account/trial');
  const landingSlash = await request.get('/account/trial/');
  const admin = await request.get('/admin/businesses');
  const missing = await request.get('/no-such-page');
  const csp = home.headers()['content-security-policy'] ?? '';
  record({
    robots,
    csp,
    homeHeaders: home.headers(),
    accountRobots: account.headers()['x-robots-tag'],
    landingHeaders: landing.headers(),
    landingSlashHeaders: landingSlash.headers(),
    adminRobots: admin.headers()['x-robots-tag'],
    missingStatus: missing.status(),
  });
  expect(robots).toBe('User-agent: *\nDisallow: /\n');
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-inline');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(account.status()).toBe(200);
  expect(account.headers()['x-robots-tag']).toBe('noindex, nofollow');
  // The setup link's landing loads the account shell and sends no referrer; every other page keeps the site's policy.
  expect(landing.status()).toBe(200);
  expect(landing.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(landing.headers()['referrer-policy']).toBe('no-referrer');
  // The landing answers with a trailing slash too, and sends no referrer there either (review R4-12).
  expect(landingSlash.status()).toBe(200);
  expect(landingSlash.headers()['referrer-policy']).toBe('no-referrer');
  expect(home.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(account.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(admin.headers()['x-robots-tag']).toBe('noindex, nofollow');
  // The protected shell carries no prerendered content and no business data.
  expect(await account.text()).not.toMatch(/<h1|Dukan ERP est|platform\/dashboard/);
  expect(missing.status()).toBe(404);
});

/** A setup link as the WhatsApp button builds it (`?t=`): plainly fake, shaped like the server's 43 characters. */
const SETUP_LINK = `/account/trial?t=${'x'.repeat(43)}`;

const PROTECTED: [string, string, Session, number][] = [
  ['account-signed-out', '/account', {}, 1280],
  ['account-signed-in', '/account', { owner: true }, 1280],
  ['account-signed-in-375', '/account', { owner: true }, 375],
  ['account-trial-available', '/account', { owner: true, trial: 'available' }, 1280],
  ['account-trial-available-375', '/account', { owner: true, trial: 'available' }, 375],
  ['account-trial-available-ar-375', '/account', { owner: true, trial: 'available', lang: 'ar' }, 375],
  ['account-trial-available-fr-375', '/account', { owner: true, trial: 'available', lang: 'fr' }, 375],
  ['account-trial-active-375', '/account', { owner: true, trial: 'active' }, 375],
  ['account-trial-paid-after-375', '/account', { owner: true, trial: 'paidAfter' }, 375],
  ['account-trial-paid-after-ar-375', '/account', { owner: true, trial: 'paidAfter', lang: 'ar' }, 375],
  ['account-trial-expired-375', '/account', { owner: true, trial: 'expired' }, 375],
  ['account-trial-link-signed-out-375', SETUP_LINK, {}, 375],
  ['account-trial-link-signed-in', SETUP_LINK, { owner: true, trial: 'available' }, 1280],
  ['account-trial-link-signed-in-ar-375', SETUP_LINK, { owner: true, trial: 'available', lang: 'ar' }, 375],
  // Stores and seats asked for during the trial (D176): paid, scheduled to its end — in every language, at both widths.
  ['account-trial-addons', '/account', { owner: true, trial: 'paidAfter', addons: 'trial_end' }, 1280],
  ['account-trial-addons-375', '/account', { owner: true, trial: 'paidAfter', addons: 'trial_end' }, 375],
  ['account-trial-addons-fr', '/account', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'fr' }, 1280],
  ['account-trial-addons-fr-375', '/account', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'fr' }, 375],
  ['account-trial-addons-ar', '/account', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'ar' }, 1280],
  ['account-trial-addons-ar-375', '/account', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'ar' }, 375],
  // No paid access approved yet: they start with the first paid month.
  ['account-trial-addons-waiting-375', '/account', { owner: true, trial: 'active', addons: 'paid_access' }, 375],
  ['admin-business-trial-addons', `/admin/businesses/${BUSINESS.id}`, { admin: true, addons: 'trial_end' }, 1280],
  ['admin-business-trial-addons-ar-375', `/admin/businesses/${BUSINESS.id}`, { admin: true, addons: 'trial_end', lang: 'ar' }, 375],
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
    if (signedIn.lang) expect([l.lang, l.dir]).toEqual([signedIn.lang, signedIn.lang === 'ar' ? 'rtl' : 'ltr']);
  });
}

test('a link preview: without a session the setup link consumes and starts nothing, and no request carries its token', async ({ page, request }) => {
  const token = 'x'.repeat(43);
  // A preview or a mail scanner fetching the address: the static shell, served with no referrer, holding no token.
  const raw = await request.get(`/account/trial?t=${token}`);
  expect(raw.status()).toBe(200);
  expect(raw.headers()['referrer-policy']).toBe('no-referrer');
  expect(await raw.text()).not.toContain(token);
  // A browser with no session: asked to sign in, and the one question it asks the API is whether a session exists.
  const errors = watchConsole(page);
  const requests: { url: string; referer: string | null; body: string | null }[] = [];
  page.on('request', (r) => requests.push({ url: r.url(), referer: r.headers()['referer'] ?? null, body: r.postData() }));
  await mockApi(page);
  const response = await page.goto(`/account/trial?t=${token}`);
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const after = requests.slice(1);
  record({ test: 'link-preview', requests: after.map((r) => ({ url: r.url.replace(token, '<token>'), referer: r.referer?.replace(token, '<token>') ?? null })), consoleErrors: errors });
  expect(after.filter((r) => r.url.includes(token) || (r.referer ?? '').includes(token) || (r.body ?? '').includes(token))).toEqual([]);
  expect(after.filter((r) => r.url.startsWith(API)).map((r) => new URL(r.url).pathname)).toEqual(['/api/v1/platform/my-subscription']);
  expect(new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash).toBe('/account/trial');
  expect(errors).toEqual([]);
});

test('the setup link with a trailing slash: no later request carries its token, in its address or as referrer (R4-12)', async ({ page }) => {
  const errors = watchConsole(page);
  const token = 'z'.repeat(43);
  const requests: { url: string; referer: string | null }[] = [];
  page.on('request', (r) => requests.push({ url: r.url(), referer: r.headers()['referer'] ?? null }));
  await mockApi(page);
  const response = await page.goto(`/account/trial/?t=${token}`);
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const after = requests.slice(1);
  record({ test: 'setup-link-trailing-slash', requests: after.map((r) => ({ url: r.url.replace(token, '<token>'), referer: r.referer?.replace(token, '<token>') ?? null })), consoleErrors: errors });
  expect(after.length).toBeGreaterThan(0);
  expect(after.filter((r) => r.url.includes(token) || (r.referer ?? '').includes(token))).toEqual([]);
  expect(new URL(page.url()).search).toBe('');
  expect(errors).toEqual([]);
});

test('the setup link: its token leaves the address at once, rides in no request’s address or referrer, and nothing is claimed by opening it', async ({ page }) => {
  const errors = watchConsole(page);
  const token = 'x'.repeat(43);
  const requests: { url: string; method: string; referer: string | null; body: string | null }[] = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), referer: r.headers()['referer'] ?? null, body: r.postData() }));
  await mockApi(page, { owner: true, trial: 'available' });
  await page.setViewportSize({ width: 375, height: 812 });
  const response = await page.goto(SETUP_LINK);
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(page.getByRole('button', { name: 'Start my 7-day free trial' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const kept = await page.evaluate(() => ({ href: location.href, local: JSON.stringify(Object.entries(localStorage)), session: JSON.stringify(Object.entries(sessionStorage)), cookie: document.cookie }));
  record({ test: 'setup-link', kept, requests: requests.map((r) => ({ ...r, body: r.body?.includes(token) ? '(carries the token)' : r.body })), consoleErrors: errors });
  expect(new URL(kept.href).pathname + new URL(kept.href).search + new URL(kept.href).hash).toBe('/account/trial');
  for (const where of [kept.local, kept.session, kept.cookie]) expect(where).not.toContain(token);
  // The document itself was asked for with the token (the WhatsApp button's query); nothing after it carries it.
  const after = requests.slice(1);
  expect(after.filter((r) => r.url.includes(token) || (r.referer ?? '').includes(token))).toEqual([]);
  // The token went once, in the body of the link check — and no claim was sent by opening the page.
  expect(after.filter((r) => r.body?.includes(token)).map((r) => [r.method, new URL(r.url).pathname])).toEqual([['POST', '/api/v1/platform/my-subscription/trial/link']]);
  expect(after.filter((r) => r.url.includes('/trial/claim'))).toEqual([]);
  expect(errors).toEqual([]);
});

/*
 * Stores and seats paid for during the trial (D176) in a real browser: the Owner's rows say "Paid · scheduled" and
 * when each starts, in the business's zone; the console lists them under their own filter. Every language at both
 * widths, with no sideways scroll, no console error and no serious accessibility violation.
 */
const SCHEDULED_WORDS = { en: 'Paid · scheduled', fr: 'Payé · programmé', ar: 'مدفوع · مجدول' } as const;
const QUEUE_FILTER = { en: 'Show', fr: 'Afficher', ar: 'عرض' } as const;
for (const lang of LANGS) {
  for (const width of [1280, 375]) {
    test(`D176: the Owner's scheduled store and seat, ${lang} at ${width} px`, async ({ page }) => {
      const errors = watchConsole(page);
      await mockApi(page, { owner: true, trial: 'paidAfter', addons: 'trial_end', lang });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/account');
      await expect(page.getByText(SCHEDULED_WORDS[lang]).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      const rows = page.locator('section:has(form) table.data tbody tr');
      await expect(rows).toHaveCount(3);
      const dates = await rows.locator('bdi').allTextContents();
      const l = await layout(page);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: join(EV, 'screenshots', 'addons', `account-${lang}-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
      await shotOf(page, 'section:has(form)', join(EV, 'screenshots', 'addons', `account-requests-${lang}-${width}.jpg`));
      // The narrowest phone too: a long status (French "En attente de paiement") wraps in its cell, never sideways.
      await page.setViewportSize({ width: 320, height: 900 });
      const at320 = await layout(page);
      record({ test: 'addons-account', lang, width, dates, layout: l, overflow320: at320.overflow, offenders320: at320.offenders, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
      // Both scheduled rows dated with the trial's end, in the business's zone (Casablanca: 10:30), never UTC's 09:30.
      expect(dates).toHaveLength(2);
      for (const d of dates) expect(d).toMatch(/10:30|١٠:٣٠/);
      expect(dates.join(' ')).not.toMatch(/09:30|٠٩:٣٠/);
      expect([l.lang, l.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
      expect(l.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(at320.overflow, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });

    test(`D176: the console's scheduled queue, ${lang} at ${width} px`, async ({ page }) => {
      const errors = watchConsole(page);
      await mockApi(page, { admin: true, addons: 'trial_end', lang });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/seat-requests');
      await page.getByRole('combobox', { name: QUEUE_FILTER[lang], exact: true }).selectOption('scheduled');
      const rows = page.locator('table.data tbody tr');
      await expect(rows).toHaveCount(2);
      await page.waitForLoadState('networkidle');
      const l = await layout(page);
      const buttons = await rows.locator('button').count();
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: join(EV, 'screenshots', 'addons', `console-queue-${lang}-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
      await shotOf(page, 'table.data', join(EV, 'screenshots', 'addons', `console-queue-table-${lang}-${width}.jpg`));
      record({ test: 'addons-console-queue', lang, width, buttons, layout: l, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
      await expect(rows.first()).toContainText(SCHEDULED_WORDS[lang]);
      expect(buttons, 'a scheduled row offers no action').toBe(0);
      expect(l.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}

/*
 * The registration's code check after a confirmation that got no answer (R2-1 / C14 on the website), in a real browser:
 * the request fails on the network, then the same code is refused as a finished registration is. The page never says
 * the code did not match; it says the account may be ready and offers sign-in. The console's businesses list tells a
 * trial business's end in the business's zone, isolated (C18). Every language at both widths, with no sideways scroll,
 * no unexpected console error and no serious accessibility violation.
 */
const CATALOGUES = { en, fr, ar } as const;
/** The two failures these pages are shown on purpose: the request with no answer, and the server's refusal. */
const EXPECTED_FAILURES = /Failed to load resource: (net::ERR_FAILED|the server responded with a status of 400)/;
for (const lang of LANGS) {
  for (const width of [1280, 375]) {
    test(`R2-1 on the website: a code check with no answer is never "did not match", and offers sign-in, ${lang} at ${width} px`, async ({ page }) => {
      const cat = CATALOGUES[lang];
      const errors = watchConsole(page);
      await mockApi(page);
      let confirmations = 0;
      await page.route(new RegExp(`^${API}/platform/register(/verify/confirm)?$`), async (route) => {
        const json = (body: unknown, status: number) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (route.request().url().endsWith('/platform/register')) {
          return json(
            {
              status: 'pending',
              created: true,
              publicStoreId: 'ST-7Q4K',
              activity: 'electronics',
              verification: { destination: 'o•••@preview.invalid', channel: 'email' },
              continuation: { token: 'continuation-for-browser-checks', expiresAt: '2026-10-15T10:00:00.000Z', expiresInSeconds: 900 },
              next: 'verify_contact',
            },
            201,
          );
        }
        confirmations += 1;
        // The first confirmation never gets an answer; the same code again is refused as a finished registration is.
        if (confirmations === 1) return route.abort('failed');
        return json({ statusCode: 400, message: 'That code did not match.', error: 'Bad Request' }, 400);
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathOf('apply', lang));
      await page.getByLabel(cat['apply.owner'], { exact: true }).fill('Aminetou');
      await page.getByLabel(cat['apply.business'], { exact: true }).fill('Boutique Test');
      await page.getByLabel(cat['apply.branch'], { exact: true }).fill('Centre');
      await page.getByLabel(cat['apply.email'], { exact: true }).fill('owner@preview.invalid');
      await page.getByLabel(cat['apply.password']).fill('a-long-password');
      await page.getByRole('radio', { name: cat['activity.electronics'] }).check();
      await page.getByRole('button', { name: cat['apply.submit'] }).click();
      const form = page.locator('form:has(input[autocomplete="one-time-code"])');
      await form.getByLabel(cat['apply.verify.code']).fill('123456');
      const confirm = form.getByRole('button', { name: cat['apply.verify.submit'], exact: true });
      await confirm.click();
      await expect(form.getByText(cat['apply.verify.lost'])).toBeVisible();
      await confirm.click();
      await expect.poll(() => confirmations).toBe(2);
      await expect(confirm).toBeEnabled();
      await page.waitForLoadState('networkidle');
      const said = await form.textContent();
      const signIn = await form.getByRole('link', { name: cat['action.signIn'], exact: true }).getAttribute('href');
      const l = await layout(page);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: join(EV, 'screenshots', 'code-check', `apply-lost-${lang}-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
      await page.setViewportSize({ width: 320, height: 900 });
      const at320 = await layout(page);
      const unexpected = errors.filter((e) => !EXPECTED_FAILURES.test(e));
      record({ test: 'code-check-lost', lang, width, confirmations, signIn, layout: l, overflow320: at320.overflow, offenders320: at320.offenders, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
      expect(said).toContain(cat['apply.verify.lost']);
      expect(said).not.toContain(cat['apply.verify.wrong']);
      expect(said).not.toContain('did not match');
      expect(said).not.toContain(cat['error.network']);
      expect(signIn).toBe('/account');
      expect([l.lang, l.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
      expect(l.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(at320.overflow, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
      expect(unexpected).toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });

    test(`C18: the businesses list tells a trial business's end in its zone, isolated, ${lang} at ${width} px`, async ({ page }) => {
      const cat = CATALOGUES[lang];
      const errors = watchConsole(page);
      await mockApi(page, { admin: true, lang });
      const row = (id: string, name: string, extra: Partial<BusinessRow>): BusinessRow => ({
        id: `0192f000-0000-7000-8000-0000000000${id}`,
        name,
        publicStoreId: `ST-${id.toUpperCase()}`,
        city: 'Nouakchott',
        createdAt: '2026-10-12T10:00:00.000Z',
        branches: 1,
        users: 2,
        state: 'active',
        status: 'activated',
        // 23:30 UTC on 20 November: already 21 November in Dubai.
        periodEnd: '2026-11-20T23:30:00.000Z',
        complimentary: null,
        version: 3,
        ...extra,
      });
      const rows = [
        row('f1', 'Boutique Dubai', { trial: { status: 'expired', endsAt: '2026-10-20T23:30:00.000Z', timeZone: 'Asia/Dubai' } }),
        row('f4', 'Boutique Console', { trial: null }),
      ];
      await page.route(new RegExp(`^${API}/platform/businesses\\?`), (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows, total: rows.length, page: 1, pageSize: 25 }) }),
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/businesses');
      const label = cat['account.period.ends'].replace('{date}', '').trim();
      const ends = (name: string) => page.locator('table.data tbody tr', { hasText: name }).locator(`td[data-label="${label}"]`);
      await expect(ends('Boutique Dubai')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const dubai = await ends('Boutique Dubai').locator('bdi').allTextContents();
      const plain = { text: await ends('Boutique Console').textContent(), isolated: await ends('Boutique Console').locator('bdi').count() };
      const l = await layout(page);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: join(EV, 'screenshots', 'trial-zone', `console-businesses-${lang}-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
      record({ test: 'businesses-ends-zone', lang, width, dubai, plain, layout: l, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
      // The Dubai business ends on the 21st at 03:30 there, with the zone named — never the 20th of this browser's UTC.
      expect(dubai).toHaveLength(1);
      expect(dubai[0]).toMatch(/(\b21\b|٢١).*(0?3:30|٣:٣٠)/);
      expect(dubai[0]).toMatch(/\(.+\)$/);
      // A business with no trial keeps the date the list always showed: no time, no zone, nothing isolated.
      expect(plain.isolated).toBe(0);
      expect(plain.text).not.toMatch(/0?3:30|٣:٣٠|\(/);
      expect([l.lang, l.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
      expect(l.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}


/*
 * The registration's code check refused by the API's rate limit, in a real browser: the limiter answers a request for a
 * new code and a confirmation with no code and its class name for a sentence ("ThrottlerException: Too Many Requests").
 * The page says, in its own words, to wait a minute — no lost answer, no wrong code, nothing of the limiter's. Every
 * language at both widths (and 320 px), with no sideways scroll and no serious accessibility violation.
 */
const LIMITED = { statusCode: 429, error: 'TOO_MANY_REQUESTS', message: 'ThrottlerException: Too Many Requests' };
for (const lang of LANGS) {
  for (const width of [1280, 375]) {
    test(`the rate limit at the code check is said in the page's words, never the limiter's, ${lang} at ${width} px`, async ({ page }) => {
      const cat = CATALOGUES[lang];
      const errors = watchConsole(page);
      await mockApi(page);
      const asked = { resends: 0, confirmations: 0 };
      await page.route(new RegExp(`^${API}/platform/register(/verify/(confirm|start))?$`), async (route) => {
        const json = (body: unknown, status: number) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        const url = route.request().url();
        if (url.endsWith('/platform/register')) {
          return json(
            {
              status: 'pending',
              created: true,
              publicStoreId: 'ST-7Q4K',
              activity: 'electronics',
              verification: { destination: 'o•••@preview.invalid', channel: 'email' },
              continuation: { token: 'continuation-for-browser-checks', expiresAt: '2026-10-15T10:00:00.000Z', expiresInSeconds: 900 },
              next: 'verify_contact',
            },
            201,
          );
        }
        if (url.endsWith('/verify/start')) asked.resends += 1;
        else asked.confirmations += 1;
        return json(LIMITED, 429);
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathOf('apply', lang));
      await page.getByLabel(cat['apply.owner'], { exact: true }).fill('Aminetou');
      await page.getByLabel(cat['apply.business'], { exact: true }).fill('Boutique Test');
      await page.getByLabel(cat['apply.branch'], { exact: true }).fill('Centre');
      await page.getByLabel(cat['apply.email'], { exact: true }).fill('owner@preview.invalid');
      await page.getByLabel(cat['apply.password']).fill('a-long-password');
      await page.getByRole('radio', { name: cat['activity.electronics'] }).check();
      await page.getByRole('button', { name: cat['apply.submit'] }).click();
      const form = page.locator('form:has(input[autocomplete="one-time-code"])');
      await form.getByRole('button', { name: cat['apply.verify.resend'], exact: true }).click();
      await expect(form.getByText(cat['error.tooManyRequests'])).toBeVisible();
      await form.getByLabel(cat['apply.verify.code']).fill('123456');
      const confirm = form.getByRole('button', { name: cat['apply.verify.submit'], exact: true });
      await confirm.click();
      await expect.poll(() => asked.confirmations).toBe(1);
      await expect(confirm).toBeEnabled();
      await page.waitForLoadState('networkidle');
      const said = await form.textContent();
      const l = await layout(page);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      await page.screenshot({ path: join(EV, 'screenshots', 'code-check', `apply-throttled-${lang}-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
      await page.setViewportSize({ width: 320, height: 900 });
      const at320 = await layout(page);
      const unexpected = errors.filter((e) => !/Failed to load resource: the server responded with a status of 429/.test(e));
      record({ test: 'code-check-throttled', lang, width, asked, said, layout: l, overflow320: at320.overflow, offenders320: at320.offenders, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
      expect(asked).toEqual({ resends: 1, confirmations: 1 });
      expect(said).toContain(cat['error.tooManyRequests']);
      expect(said).not.toMatch(/Throttler|Too Many Requests/i);
      expect(said).not.toContain(cat['error.generic']);
      expect(said).not.toContain(cat['apply.verify.lost']);
      expect(said).not.toContain(cat['apply.verify.wrong']);
      expect([l.lang, l.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
      expect(l.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(at320.overflow, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
      expect(unexpected).toEqual([]);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}
