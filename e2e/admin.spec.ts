import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The console's own site (`VITE_SITE_SURFACE=admin`) in a real browser, served with its `_headers` and `_redirects`. Run
 * with `E2E_SURFACE=admin` against an admin build. No real account: the API answers "not signed in" to everything.
 */
const LANGS = [
  { lang: 'en', dir: 'ltr' },
  { lang: 'fr', dir: 'ltr' },
  { lang: 'ar', dir: 'rtl' },
] as const;
const WIDTHS = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
];

async function signedOut(page: Page, lang: string) {
  await page.addInitScript((l) => localStorage.setItem('erp.web.language', l), lang);
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      status: route.request().method() === 'OPTIONS' ? 204 : 401,
      headers: { 'access-control-allow-origin': new URL(page.url() || 'http://127.0.0.1:4173').origin, 'access-control-allow-credentials': 'true' },
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not signed in' }),
    }),
  );
}

for (const { lang, dir } of LANGS) {
  for (const size of WIDTHS) {
    test(`sign-in, ${lang}, ${size.width} px: direction, one heading, no sideways scroll, WCAG AA`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewportSize(size);
      await signedOut(page, lang);
      await page.goto('/admin');
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations.map((v) => v.id)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`an address of the customers is an unknown page here, ${lang}`, async ({ page }) => {
    await signedOut(page, lang);
    for (const path of ['/subscription', '/subscription/plan', '/join', '/account', '/about']) {
      const answer = await page.goto(path);
      expect(answer?.status(), path).toBe(404);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await expect(page.locator(`a[href="/admin"].btn`)).toBeVisible();
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
    }
  });
}

test('the root leads to the console, and its console routes are served', async ({ page }) => {
  await signedOut(page, 'en');
  await page.goto('/');
  await expect(page).toHaveURL(/\/admin$/);
  expect((await page.goto('/admin/proofs'))?.status()).toBe(200);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('every page says noindex and carries the policy; no source map is served', async ({ request }) => {
  for (const path of ['/admin', '/admin/proofs', '/nowhere']) {
    const headers = (await request.get(path)).headers();
    expect(headers['x-robots-tag'], path).toContain('noindex');
    expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
  }
  expect(await (await request.get('/robots.txt')).text()).toBe('User-agent: *\nDisallow: /\n');
  expect((await request.get('/sitemap.xml')).status()).toBe(404);
});
