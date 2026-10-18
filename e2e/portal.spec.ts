import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { EntitlementState, PortalStatus, TrialStatus } from '../src/api/types';
import { ar } from '../src/i18n/ar';
import { en, type Catalogue } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { BRANCHES, LINES, NO_TRIAL, PORTAL_SESSION, TRIAL_START, activityOptions, portalStatus, subscription, trialStatus, trialView } from '../test/fixtures-data';

/**
 * The Dukan ERP portal (`VITE_SITE_SURFACE=portal`, docs/101) in a real browser, served as Cloudflare Pages serves it
 * (`_headers` and `_redirects` included). Run with `E2E_SURFACE=portal` against a portal build. The API is answered
 * from the component tests' fixtures — no real account, password or token. Each state in EN, FR and AR at a phone and a
 * desktop width: direction, one h1, no sideways scroll, the WCAG 2.1 AA audit, no console error, a screenshot.
 */
const EV = process.env.EV ?? 'e2e-output';
const API = 'http://127.0.0.1:3999/api/v1';
const LANGS = ['en', 'fr', 'ar'] as const;
const CATALOGUE: Record<(typeof LANGS)[number], Catalogue> = { en, fr, ar };
const WIDTHS = [
  { name: '375', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

function record(name: string, f: Record<string, unknown>) {
  const file = join(EV, 'browser', `${name.replace(/[^\w.-]+/g, '_')}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(f, null, 2));
}

interface State {
  status: PortalStatus;
  trial: TrialStatus;
  entitlement: EntitlementState;
}

/** The states an Owner meets: a trial to claim, a running trial, the paid grace, and read-only once it ended. */
const STATES: Record<string, State> = {
  'trial-available': {
    entitlement: 'trial_available',
    trial: trialStatus(),
    status: portalStatus({ state: 'trial_available', access: 'read_only', period: { start: null, end: null }, notices: { next: null, last: null }, grace: { ...portalStatus().grace, availableAtPeriodEnd: null, usesInWindow: 0, usesRemaining: 3, nextUseRestoredAt: null } }),
  },
  'trial-active': {
    entitlement: 'trial_active',
    trial: { state: 'trial_active', trial: trialView('active'), offer: null, setup: null, calculatedAt: TRIAL_START },
    status: portalStatus({
      state: 'trial_active',
      period: { start: null, end: null },
      notices: { next: { kind: 'trial_reminder', threshold: 'h72', dueAt: '2026-10-17T09:30:00.000Z' }, last: null },
      grace: { ...portalStatus().grace, availableAtPeriodEnd: null, usesInWindow: 0, usesRemaining: 3, nextUseRestoredAt: null },
    }),
  },
  'grace-active': {
    entitlement: 'grace',
    trial: NO_TRIAL,
    status: portalStatus({
      state: 'grace',
      grace: { ...portalStatus().grace, status: 'active', startedAt: '2026-11-01T09:30:00.000Z', endsAt: '2026-11-04T09:30:00.000Z', hoursRemaining: 31, availableAtPeriodEnd: null },
      notices: {
        next: { kind: 'grace_reminder', threshold: 'h24', dueAt: '2026-11-03T09:30:00.000Z' },
        last: { kind: 'paid_expired', threshold: 'end', state: 'delivered', channel: 'whatsapp', destination: '+222••••1234', fallbackReason: null, failureReason: null, at: '2026-11-01T09:31:00.000Z' },
      },
    }),
  },
  'read-only': {
    entitlement: 'expired',
    trial: NO_TRIAL,
    status: portalStatus({
      access: 'read_only',
      state: 'expired',
      grace: { ...portalStatus().grace, status: 'unavailable', startedAt: '2026-11-01T09:30:00.000Z', availableAtPeriodEnd: null, usesInWindow: 3, usesRemaining: 0 },
      notices: {
        next: null,
        last: { kind: 'paid_expired', threshold: 'end', state: 'accepted', channel: 'email', destination: 'o•••@example.test', fallbackReason: 'number_undeliverable', failureReason: null, at: '2026-11-01T09:31:00.000Z' },
      },
    }),
  },
};

/** The API, answered from fixtures: signed in for `state`, signed out without one. Every POST is recorded with its CSRF token. */
async function mockApi(page: Page, lang: (typeof LANGS)[number], state?: State) {
  await page.addInitScript((l) => localStorage.setItem('erp.web.language', l), lang);
  const posts: { path: string; csrf: string | null; body: unknown }[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const path = url.slice(API.length + 1);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'POST') posts.push({ path, csrf: req.headers()['x-csrf-token'] ?? null, body: req.postDataJSON() ?? null });
    if (!state) return json({ statusCode: 401, message: 'Unauthorized' }, 401);
    const sub = subscription(BRANCHES, LINES);
    const ended = state.entitlement === 'expired';
    switch (path) {
      case 'platform/portal/session':
        return json(PORTAL_SESSION);
      case 'platform/my-subscription':
        return json({ ...sub, entitlement: { ...sub.entitlement, state: state.entitlement, canWrite: !ended && state.entitlement !== 'trial_available', trial: state.trial.trial } });
      case 'platform/my-subscription/status':
        return json(state.status);
      case 'platform/my-subscription/trial':
        return json(state.trial);
      case 'platform/my-subscription/trial/claim':
        return json({ claimed: true, replayed: false, state: 'trial_active', trial: trialView('active'), subscriptionVersion: 2 }, 201);
      case 'platform/my-subscription/activity-options':
        return json(activityOptions());
      case 'platform/my-subscription/seat-requests':
        return json([]);
      case 'platform/payment-instructions':
        return json({ available: false, providers: [], defaultProvider: null, placeholder: false });
      default:
        return json({ statusCode: 404, message: 'Not Found' }, 404);
    }
  });
  return posts;
}

function watch(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (401|404)/.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function facts(page: Page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    links: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? ''),
    html: document.documentElement.outerHTML,
  }));
}

async function audit(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`);
}

test('the host files: nothing indexed, the root and the old address sent to /subscription, the shell for every portal address', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  const root = await request.get('/', { maxRedirects: 0 });
  const retired = await request.get('/account/trial', { maxRedirects: 0 });
  const page = await request.get('/subscription');
  const admin = await request.get('/admin');
  const missing = await request.get('/privacy');
  const sitemap = await request.get('/sitemap.xml');
  record('portal-host-files', {
    robots: await robots.text(),
    root: [root.status(), root.headers()['location']],
    retired: [retired.status(), retired.headers()['location']],
    pageHeaders: page.headers(),
    missing: [missing.status(), missing.headers()['x-robots-tag']],
    sitemap: sitemap.status(),
  });
  expect(await robots.text()).toBe('User-agent: *\nDisallow: /\n');
  expect([root.status(), root.headers()['location']]).toEqual([302, '/subscription']);
  expect([retired.status(), retired.headers()['location']]).toEqual([301, '/subscription']);
  expect(page.status()).toBe(200);
  expect(page.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(page.headers()['cache-control']).toBe('no-store');
  expect(page.headers()['x-frame-options']).toBe('DENY');
  expect(page.headers()['content-security-policy']).toContain(`connect-src 'self' http://127.0.0.1:3999`);
  expect(admin.status()).toBe(200);
  // A page of the company site is not here: a 404, and even that says noindex.
  expect([missing.status(), missing.headers()['x-robots-tag']]).toEqual([404, 'noindex, nofollow']);
  expect(sitemap.status()).toBe(404);
  // The shell holds no content and names no other portal.
  const html = await page.text();
  expect(html).not.toMatch(/<h1|portal\.tsxmr\.com/);
});

for (const lang of LANGS) {
  for (const w of WIDTHS) {
    test(`signed out, ${lang} at ${w.name}: the Owner's sign-in, the company site's legal links, ${lang === 'ar' ? 'right to left' : 'left to right'}`, async ({ page }) => {
      const errors = watch(page);
      await mockApi(page, lang);
      await page.setViewportSize({ width: w.width, height: w.height });
      await page.goto('/');
      const cat = CATALOGUE[lang];
      await expect(page.getByRole('heading', { name: cat['portal.title'], level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const f = await facts(page);
      const serious = await audit(page);
      await page.screenshot({ path: join(EV, 'screenshots', 'portal', `${lang}-sign-in-${w.name}.jpg`), fullPage: true, type: 'jpeg', quality: 75 });
      record(`portal-sign-in-${lang}-${w.name}`, { ...f, html: undefined, serious, errors });
      expect(new URL(page.url()).pathname).toBe('/subscription');
      expect([f.lang, f.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
      expect(f.h1).toBe(1);
      expect(f.robots).toBe('noindex, nofollow');
      expect(f.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      // The legal and support pages are the company site's (a preview names its marked test origin).
      expect(f.links.filter((h) => /privacy|terms|support|account-deletion/.test(h)).every((h) => h.startsWith('https://'))).toBe(true);
      expect(f.html).not.toContain('portal.tsxmr.com');
      expect(serious).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

for (const [name, state] of Object.entries(STATES)) {
  for (const lang of LANGS) {
    for (const w of WIDTHS) {
      test(`signed in, ${name}, ${lang} at ${w.name}: the server's status, in words, no sideways scroll, no violation`, async ({ page }) => {
        const errors = watch(page);
        await mockApi(page, lang, state);
        await page.setViewportSize({ width: w.width, height: w.height });
        await page.goto('/subscription');
        const cat = CATALOGUE[lang];
        await expect(page.getByRole('heading', { name: cat['portal.status.title'], level: 2 })).toBeVisible();
        await expect(page.getByText(cat[`portal.access.${state.status.access}`], { exact: true })).toBeVisible();
        await page.waitForLoadState('networkidle');
        const f = await facts(page);
        const serious = await audit(page);
        await page.screenshot({ path: join(EV, 'screenshots', 'portal', `${lang}-${name}-${w.name}.jpg`), fullPage: true, type: 'jpeg', quality: 75 });
        record(`portal-${name}-${lang}-${w.name}`, { ...f, html: undefined, serious, errors });
        expect([f.lang, f.dir]).toEqual([lang, lang === 'ar' ? 'rtl' : 'ltr']);
        expect(f.h1).toBe(1);
        expect(f.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
        expect(serious).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}

for (const lang of LANGS) {
  test(`the claim, ${lang}: the button asks first, the confirmation sends it once, with the session's CSRF token`, async ({ page }) => {
    const errors = watch(page);
    const posts = await mockApi(page, lang, STATES['trial-available']);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/subscription');
    const cat = CATALOGUE[lang];
    await page.getByRole('button', { name: cat['trial.claim'] }).click();
    await expect(page.getByText(cat['trial.confirm.body'])).toBeVisible();
    expect(posts.filter((p) => p.path.endsWith('/trial/claim'))).toEqual([]);
    // From the top: a full-page capture taken where the click scrolled would stitch the sticky header into the page.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(EV, 'screenshots', 'portal', `${lang}-trial-confirm-375.jpg`), fullPage: true, type: 'jpeg', quality: 75 });
    const serious = await audit(page);
    await page.getByRole('button', { name: cat['trial.confirm.yes'] }).click();
    await expect.poll(() => posts.filter((p) => p.path.endsWith('/trial/claim')).length).toBe(1);
    const [claim] = posts.filter((p) => p.path.endsWith('/trial/claim'));
    record(`portal-claim-${lang}`, { claim, serious, errors });
    expect(claim!.csrf).toBe(PORTAL_SESSION.csrfToken);
    expect(claim!.body).toEqual({ idempotencyKey: expect.any(String), termsVersion: '2026-10-18' });
    expect(serious).toEqual([]);
    expect(errors).toEqual([]);
  });
}
