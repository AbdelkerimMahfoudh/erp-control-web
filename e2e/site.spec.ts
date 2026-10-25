import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { BusinessRow, EntitlementState, SeatRequest, TrialStatus } from '../src/api/types';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { pathOf, PUBLIC_ROUTES } from '../src/site/routes';
import { B1, B2, BRANCHES, LINES, NO_TRIAL, PORTAL_SESSION, TRIAL_END, TRIAL_START, TRIAL_ZONE, allocation, portalStatus, scheduledRequest, subscription, trialStatus, trialView } from '../test/fixtures-data';

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
 * The free trial's states as the portal's Owner page meets them (2026-10-13, docs/101), from the component tests'
 * fixtures: the business state, the Owner's trial read, and the trial the entitlement carries.
 */
const TRIALS: Record<'available' | 'active' | 'paidAfter' | 'expired', TrialStatus> = {
  available: trialStatus(),
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

/** The portal's status panel for the business of `trial`, or the paid business of the other fixtures. */
function ownerStatus(trial: Session['trial']) {
  if (!trial) return portalStatus();
  const status = TRIALS[trial];
  return portalStatus({
    access: status.state === 'trial_expired' ? 'read_only' : 'operational',
    state: status.state as EntitlementState,
    period: { start: null, end: null },
    grace: { ...portalStatus().grace, availableAtPeriodEnd: null, usesInWindow: 0, usesRemaining: 3, nextUseRestoredAt: null },
    notices: status.state === 'trial_active' ? { next: { kind: 'trial_reminder', threshold: 'h72', dueAt: '2026-10-17T09:30:00.000Z' }, last: null } : { next: null, last: null },
  });
}

/** What the console's oversight pages read (0099): a message of each outcome, a grace of each decision, a trial claimed. */
const OVERSIGHT = (() => {
  const business = { id: BUSINESS.id, name: BUSINESS.name, publicStoreId: BUSINESS.publicStoreId };
  const message = (over: Record<string, unknown>) => ({
    id: `n-${Object.values(over).join('-')}`,
    kind: 'paid_reminder',
    threshold: 'h72',
    variant: null,
    state: 'accepted',
    channel: 'whatsapp',
    destination: '+222••••1234',
    fallbackReason: null,
    failureReason: null,
    cancelReason: null,
    attempts: 1,
    resend: false,
    dueAt: '2026-10-29T09:30:00.000Z',
    acceptedAt: '2026-10-29T09:30:05.000Z',
    completedAt: '2026-10-29T09:30:05.000Z',
    createdAt: '2026-10-29T09:30:00.000Z',
    business,
    ...over,
  });
  return {
    notices: {
      rows: [
        message({}),
        message({ kind: 'portal_instructions', threshold: 'resend:x', resend: true, channel: 'email', destination: 'o•••@preview.invalid', fallbackReason: 'number_undeliverable' }),
        message({ kind: 'grace_ended', threshold: 'end', state: 'failed', channel: null, destination: null, failureReason: 'opted_out', acceptedAt: null }),
        message({ kind: 'trial_reminder', threshold: 'h24', state: 'cancelled', cancelReason: 'suspended', acceptedAt: null }),
      ],
      total: 4,
      page: 1,
      pageSize: 50,
      byState: { pending: 2, sending: 0, accepted: 31, delivered: 12, failed: 3, cancelled: 4, superseded: 1 },
    },
    grace: {
      rules: { allowance: 3, windowMonths: 12, durationHours: 72 },
      summary: { running: 2, atAllowance: 1, withUse: 5 },
      rows: [
        { id: 'g1', business, decision: 'granted', periodEnd: '2026-11-01T09:30:00.000Z', startedAt: '2026-11-01T09:30:00.000Z', endsAt: '2026-11-04T09:30:00.000Z', usesBefore: 1, recordedBy: 'evaluation', recordedAt: '2026-11-01T09:31:00.000Z', running: true, timeZone: TRIAL_ZONE },
        { id: 'g2', business, decision: 'refused', periodEnd: '2026-10-01T09:30:00.000Z', startedAt: '2026-10-01T09:30:00.000Z', endsAt: '2026-10-01T09:30:00.000Z', usesBefore: 3, recordedBy: 'sweeper', recordedAt: '2026-10-01T09:31:00.000Z', running: false, timeZone: TRIAL_ZONE },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
      calculatedAt: '2026-11-02T12:00:00.000Z',
    },
    trials: {
      summary: { active: 4, expired: 9, eligibleUnclaimed: 6 },
      rows: [{ id: 't1', business, registrationMethod: 'phone', status: 'active', claimedAt: TRIAL_START, endsAt: TRIAL_END, expiryRecordedAt: null, termsVersion: '2026-10-18', timeZone: TRIAL_ZONE }],
      total: 1,
      page: 1,
      pageSize: 50,
      calculatedAt: TRIAL_START,
    },
  };
})();

/** The API the pages may call, answered from fixtures: signed out unless a test says otherwise. */
async function mockApi(page: Page, signedIn: Session = {}) {
  if (signedIn.lang) await page.addInitScript((lang) => localStorage.setItem('erp.web.language', lang), signedIn.lang);
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.endsWith('/platform/plan')) return json(PLAN);
    // The Owner's portal session (0099): the session route names who is signed in; nothing to refresh.
    if (url.endsWith('/platform/portal/session')) return signedIn.owner ? json(PORTAL_SESSION) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/portal/refresh')) return json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/my-subscription')) return signedIn.owner ? json(ownerAccount(signedIn.trial)) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/my-subscription/status')) return signedIn.owner ? json(ownerStatus(signedIn.trial)) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/my-subscription/trial')) return signedIn.owner ? json(signedIn.trial ? TRIALS[signedIn.trial] : NO_TRIAL) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/payment-instructions')) return signedIn.owner ? json({ available: false, providers: [], defaultProvider: null, placeholder: false }) : json({ message: 'Unauthorized' }, 401);
    if (url.endsWith('/platform/admin/me')) return signedIn.admin ? json({ id: 'a1', email: 'admin@preview.invalid', name: 'Preview administrator' }) : json({ message: 'Unauthorized' }, 401);
    // The console's oversight of the lifecycle (0099): messages, grace decisions, trials claimed.
    if (signedIn.admin && url.includes('/platform/notices')) return json(OVERSIGHT.notices);
    if (signedIn.admin && url.includes('/platform/grace')) return json(OVERSIGHT.grace);
    if (signedIn.admin && url.includes('/platform/trial-claims')) return json(OVERSIGHT.trials);
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

/** An address long enough that, with its "verified" chip, it cannot sit on one line of a phone's labelled card. */
const LONG_ADDRESS = 'proprietaire.boutique.ksar@preview.invalid';

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
    people: [
      { id: 'p1', name: 'Mariem Ould Ahmed', email: LONG_ADDRESS, phone: '+22236001234', emailVerified: true, phoneVerified: true, isActive: true, status: 'active', lastLoginAt: '2026-10-14T08:00:00.000Z' },
    ],
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
  // Once the script runs, the phone menu is a button that states whether it is open.
  const menuButton = page.locator('button.menu-button');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.focus();
  await page.keyboard.press('Enter');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#site-menu a').first()).toBeVisible();
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
  const subscription = await request.get('/subscription');
  const retired = await request.get('/account', { maxRedirects: 0 });
  const retiredLanding = await request.get('/account/trial', { maxRedirects: 0 });
  const admin = await request.get('/admin/businesses');
  const missing = await request.get('/no-such-page');
  const csp = home.headers()['content-security-policy'] ?? '';
  record({
    robots,
    csp,
    homeHeaders: home.headers(),
    subscriptionHeaders: subscription.headers(),
    retired: [retired.status(), retired.headers()['location']],
    retiredLanding: [retiredLanding.status(), retiredLanding.headers()['location']],
    adminRobots: admin.headers()['x-robots-tag'],
    missingStatus: missing.status(),
  });
  expect(robots).toBe('User-agent: *\nDisallow: /\n');
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-inline');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(subscription.status()).toBe(200);
  expect(subscription.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(subscription.headers()['cache-control']).toBe('no-store');
  // The Owner page's old address — and the retired setup link's landing — lead to it for good.
  expect([retired.status(), retired.headers()['location']]).toEqual([301, '/subscription']);
  expect([retiredLanding.status(), retiredLanding.headers()['location']]).toEqual([301, '/subscription']);
  // No address holds a token any more: every page keeps the site's referrer policy.
  expect(home.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(subscription.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(admin.headers()['x-robots-tag']).toBe('noindex, nofollow');
  // The protected shell carries no prerendered content and no business data.
  expect(await subscription.text()).not.toMatch(/<h1|Dukan ERP est|platform\/dashboard/);
  expect(missing.status()).toBe(404);
});

const PROTECTED: [string, string, Session, number][] = [
  ['subscription-signed-out', '/subscription', {}, 1280],
  ['subscription-signed-in', '/subscription', { owner: true }, 1280],
  ['subscription-signed-in-375', '/subscription', { owner: true }, 375],
  ['subscription-trial-available', '/subscription', { owner: true, trial: 'available' }, 1280],
  ['subscription-trial-available-375', '/subscription', { owner: true, trial: 'available' }, 375],
  ['subscription-trial-available-ar-375', '/subscription', { owner: true, trial: 'available', lang: 'ar' }, 375],
  ['subscription-trial-available-fr-375', '/subscription', { owner: true, trial: 'available', lang: 'fr' }, 375],
  ['subscription-trial-active-375', '/subscription', { owner: true, trial: 'active' }, 375],
  ['subscription-trial-paid-after-375', '/subscription', { owner: true, trial: 'paidAfter' }, 375],
  ['subscription-trial-paid-after-ar-375', '/subscription', { owner: true, trial: 'paidAfter', lang: 'ar' }, 375],
  ['subscription-trial-expired-375', '/subscription', { owner: true, trial: 'expired' }, 375],
  // Stores and seats asked for during the trial (D176): paid, scheduled to its end — in every language, at both widths.
  ['subscription-trial-addons', '/subscription', { owner: true, trial: 'paidAfter', addons: 'trial_end' }, 1280],
  ['subscription-trial-addons-375', '/subscription', { owner: true, trial: 'paidAfter', addons: 'trial_end' }, 375],
  ['subscription-trial-addons-fr', '/subscription', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'fr' }, 1280],
  ['subscription-trial-addons-fr-375', '/subscription', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'fr' }, 375],
  ['subscription-trial-addons-ar', '/subscription', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'ar' }, 1280],
  ['subscription-trial-addons-ar-375', '/subscription', { owner: true, trial: 'paidAfter', addons: 'trial_end', lang: 'ar' }, 375],
  // No paid access approved yet: they start with the first paid month.
  ['subscription-trial-addons-waiting-375', '/subscription', { owner: true, trial: 'active', addons: 'paid_access' }, 375],
  ['admin-business-trial-addons', `/admin/businesses/${BUSINESS.id}`, { admin: true, addons: 'trial_end' }, 1280],
  ['admin-business-trial-addons-ar-375', `/admin/businesses/${BUSINESS.id}`, { admin: true, addons: 'trial_end', lang: 'ar' }, 375],
  ['admin-sign-in', '/admin', {}, 1280],
  ['admin-dashboard', '/admin', { admin: true }, 1280],
  ['admin-dashboard-375', '/admin', { admin: true }, 375],
  // The lifecycle's oversight (0099): every message, the grace decisions, the trials claimed — at both widths, in Arabic too.
  ['admin-messages', '/admin/messages', { admin: true }, 1280],
  ['admin-messages-375', '/admin/messages', { admin: true }, 375],
  ['admin-messages-ar-375', '/admin/messages', { admin: true, lang: 'ar' }, 375],
  ['admin-grace', '/admin/grace', { admin: true }, 1280],
  ['admin-grace-375', '/admin/grace', { admin: true }, 375],
  ['admin-grace-fr-375', '/admin/grace', { admin: true, lang: 'fr' }, 375],
  ['admin-trials', '/admin/trials', { admin: true }, 1280],
  ['admin-trials-ar-375', '/admin/trials', { admin: true, lang: 'ar' }, 375],
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

for (const [path, name] of [
  ['/admin/messages', 'messages'],
  ['/admin/grace', 'grace'],
  ['/admin/trials', 'trials'],
] as const) {
  for (const lang of ['en', 'ar'] as const) {
    test(`the console's ${name} (0099), ${lang} at 375 px: one table to read, no sideways scroll, no serious violation`, async ({ page }) => {
      const errors = watchConsole(page);
      await mockApi(page, { admin: true, lang });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      await expect(page.locator('table.data')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const l = await layout(page);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      record({ test: `console-${name}`, lang, layout: l, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
      expect([l.lang, l.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
      expect(l.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

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
      await page.goto('/subscription');
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
      // Both scheduled rows dated with the trial's end, in the business's zone (Lagos: 10:30), never UTC's 09:30.
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
 * The console's business page keeps to the page (found against the real API, 2026-10-16): a long verified address and
 * its chip pushed a 375 px phone sideways, and at 1280 px the stores table ran under the monthly total beside it.
 */
for (const lang of LANGS) {
  test(`the console's business page keeps to the page, ${lang} at 375, 320 and 1280 px`, async ({ page }) => {
    const errors = watchConsole(page);
    await mockApi(page, { admin: true, addons: 'trial_end', lang });
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`/admin/businesses/${BUSINESS.id}`);
    await expect(page.getByText(LONG_ADDRESS)).toBeVisible();
    await page.waitForLoadState('networkidle');
    const at375 = await layout(page);
    await page.setViewportSize({ width: 320, height: 900 });
    const at320 = await layout(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    const tables = await page.locator('.card table.data').evaluateAll((els) =>
      els.map((table) => {
        const card = table.closest('.card')!.getBoundingClientRect();
        const box = (table.closest('.table-scroll') ?? table).getBoundingClientRect();
        return { inside: box.left >= card.left - 0.5 && box.right <= card.right + 0.5 };
      }),
    );
    const at1280 = await layout(page);
    record({ test: 'console-business-fits', lang, overflow375: at375.overflow, offenders375: at375.offenders, overflow320: at320.overflow, offenders320: at320.offenders, tables });
    expect(at375.overflow, `no sideways scroll at 375 px: ${at375.offenders.join(', ')}`).toBeLessThanOrEqual(0);
    expect(at320.overflow, `no sideways scroll at 320 px: ${at320.offenders.join(', ')}`).toBeLessThanOrEqual(0);
    expect(at1280.overflow, 'no sideways scroll at 1280 px').toBeLessThanOrEqual(0);
    expect(tables.length).toBeGreaterThan(1);
    expect(tables, 'every table keeps inside its card at 1280 px').toEqual(tables.map(() => ({ inside: true })));
    expect(errors).toEqual([]);
  });
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
              verification: { destination: '+222••••0001', channel: 'phone' },
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
      await page.getByLabel(cat['apply.phone']).fill('+22236000001');
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
      expect(signIn).toBe('/subscription');
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
      await page.getByLabel(cat['apply.phone']).fill('+22236000001');
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

// ── Promoters, the registration link and the promo code (0103, D221) ─────────────────────────────────────────────────

const PROMOTER_ID = '0192f000-0000-7000-8000-0000000000p1';
const PROMOTER_NUMBER = '+22236001122';
const PROMOTER_NOTE = 'Met at the Capitale market';
// A token-shaped fixture (50 base64url characters), built rather than written: the stub API answers whatever it is.
const JOIN_TOKEN = Buffer.alloc(37, 1).toString('base64url');
const PROMOTER = {
  id: PROMOTER_ID,
  displayName: 'Sidi Mohamed Ould Ahmed',
  whatsappMasked: '+222***22',
  whatsappNumber: PROMOTER_NUMBER,
  note: PROMOTER_NOTE,
  isActive: true,
  createdAt: '2026-10-25T08:00:00.000Z',
  createdBy: 'admin@preview.invalid',
  updatedBy: 'admin@preview.invalid',
  updatedAt: '2026-10-25T08:00:00.000Z',
  code: { code: '004217', version: 2, issuedAt: '2026-10-25T08:05:00.000Z', issuedBy: 'admin@preview.invalid' },
  qrLink: `https://dukan.tsxmr.com/join?r=${JOIN_TOKEN}`,
  registrations: 3,
  completedRegistrations: 2,
  codeHistory: [
    { code: '004217', version: 2, issuedAt: '2026-10-25T08:05:00.000Z', issuedBy: 'admin@preview.invalid', retiredAt: null, retiredBy: null },
    { code: '771903', version: 1, issuedAt: '2026-10-24T08:05:00.000Z', issuedBy: 'admin@preview.invalid', retiredAt: '2026-10-25T08:05:00.000Z', retiredBy: 'admin@preview.invalid' },
  ],
};
const ATTRIBUTED = {
  total: 2,
  page: 0,
  pageSize: 50,
  rows: [
    { companyId: '0192f000-0000-7000-8000-0000000000b1', businessName: 'Boutique Aicha Électronique', isTest: false, registeredAt: '2026-10-25T10:00:00.000Z', status: 'pending_activation', closed: false, completed: true, source: 'promoter', mechanism: 'promoter_qr', promoter: { id: PROMOTER_ID, nameSnapshot: 'Sidi Mohamed Ould Ahmed', codeVersion: 2 }, inviter: null },
    { companyId: '0192f000-0000-7000-8000-0000000000b2', businessName: 'Phone Center Ksar', isTest: true, registeredAt: '2026-10-24T10:00:00.000Z', status: 'activated', closed: false, completed: false, source: 'user_invite', mechanism: 'user_invite', promoter: null, inviter: { companyId: '0192f000-0000-7000-8000-0000000000b3', businessName: 'Nour Electronics' } },
  ],
};

/** The promoter routes, answered on top of `mockApi` (a later route is matched first). */
async function mockAcquisition(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/platform/promoters?')) {
      return json({ total: 1, page: 0, pageSize: 50, rows: [{ id: PROMOTER_ID, displayName: PROMOTER.displayName, whatsappMasked: PROMOTER.whatsappMasked, code: '004217', isActive: true, createdAt: PROMOTER.createdAt, registrations: 3, completedRegistrations: 2 }] });
    }
    if (url.endsWith(`/platform/promoters/${PROMOTER_ID}`)) return json(PROMOTER);
    if (url.includes(`/platform/promoters/${PROMOTER_ID}/businesses`)) return json({ ...ATTRIBUTED, rows: ATTRIBUTED.rows.slice(0, 1), total: 1 });
    if (url.includes('/platform/acquisitions/summary')) return json({ none: 4, promoter: 1, userInvite: 2, total: 7 });
    if (url.includes('/platform/acquisitions?')) return json(ATTRIBUTED);
    if (url.endsWith('/platform/acquisition/link')) return json({ usable: true, source: 'promoter', promoterName: PROMOTER.displayName, code: '004217' });
    if (url.endsWith('/platform/acquisition/code')) return json({ usable: true, source: 'promoter', promoterName: PROMOTER.displayName, code: '004217' });
    return route.fallback();
  });
}

const ACQUISITION_PAGES: [name: string, path: string, admin: boolean][] = [
  ['promoters', '/admin/promoters', true],
  ['promoter', `/admin/promoters/${PROMOTER_ID}`, true],
  ['sources', '/admin/sources', true],
  ['join', `/join?r=${JOIN_TOKEN}`, false],
];

for (const lang of LANGS) {
  for (const theme of ['light', 'dark'] as const) {
    for (const [name, path, admin] of ACQUISITION_PAGES) {
      test(`promoter attribution: ${name}, ${lang}, ${theme}, at 375 and 320 px and desktop`, async ({ page }) => {
        const errors = watchConsole(page);
        await page.addInitScript((t) => localStorage.setItem('erp.web.theme', t), theme);
        await mockApi(page, { admin, lang });
        await mockAcquisition(page);
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const l = await layout(page);
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        await page.screenshot({ path: join(EV, 'screenshots', 'promoters', `${name}-${lang}-${theme}-375.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
        await page.setViewportSize({ width: 320, height: 720 });
        const at320 = await layout(page);
        await page.screenshot({ path: join(EV, 'screenshots', 'promoters', `${name}-${lang}-${theme}-320.jpg`), fullPage: true, type: 'jpeg', quality: 60 });
        await page.setViewportSize({ width: 1280, height: 800 });
        const desktop = await layout(page);
        const text = await page.locator('body').innerText();
        record({ test: 'promoter-attribution', name, lang, theme, layout: l, overflow320: at320.overflow, offenders320: at320.offenders, consoleErrors: errors, axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
        expect([l.lang, l.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
        expect(l.robots).toBe('noindex, nofollow');
        expect(l.overflow, 'no sideways scroll at 375 px').toBeLessThanOrEqual(0);
        expect(at320.overflow, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
        expect(desktop.overflow, 'no sideways scroll at desktop').toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
        expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
        if (name === 'promoters') expect(text).not.toContain(PROMOTER_NUMBER);
        if (name === 'join') {
          // The token left the address at once, and nothing personal is shown.
          expect(new URL(page.url()).search).toBe('');
          expect(text).not.toContain(PROMOTER_NUMBER);
        }
        if (name === 'promoter') {
          const card = await page.getByTestId('promoter-card').innerText();
          expect(card).not.toContain(PROMOTER_NUMBER);
          expect(card).not.toContain(PROMOTER_NOTE);
          expect(card).toContain('004217');
        }
      });
    }
  }
}

for (const lang of LANGS) {
  test(`promoter attribution: the promo code on the application form, ${lang}, typed in Arabic digits, at 320 px`, async ({ page }) => {
    const cat = { en, fr, ar }[lang];
    const errors = watchConsole(page);
    await mockApi(page);
    await mockAcquisition(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(pathOf('apply', lang));
    const first = page.getByLabel(cat['promo.digit'].replace('{n}', '1'), { exact: true });
    await first.click();
    await page.keyboard.insertText('٠٠٤٢١٧');
    await expect(page.getByText(cat['promo.from'].replace('{name}', PROMOTER.displayName))).toBeVisible();
    const digits = await page.locator('.code-box').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).join(''));
    const order = await page.locator('.code-box').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    const l = await layout(page);
    await page.screenshot({ path: join(EV, 'screenshots', 'promoters', `apply-promo-${lang}-320.jpg`), fullPage: true, type: 'jpeg', quality: 60 });
    expect(digits).toBe('004217');
    // Left to right on every page, Arabic included: the first digit is the leftmost box.
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(l.overflow, 'no sideways scroll at 320 px').toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}
