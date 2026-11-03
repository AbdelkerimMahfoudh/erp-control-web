# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> every page says noindex and carries the policy; no source map is served
- Location: e2e/admin.spec.ts:69:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Matcher error: received value must not be null nor undefined

Received has value: undefined
```

# Test source

```ts
  1  | import AxeBuilder from '@axe-core/playwright';
  2  | import { expect, test, type Page } from '@playwright/test';
  3  | 
  4  | /**
  5  |  * The console's own site (`VITE_SITE_SURFACE=admin`) in a real browser, served with its `_headers` and `_redirects`. Run
  6  |  * with `E2E_SURFACE=admin` against an admin build. No real account: the API answers "not signed in" to everything.
  7  |  */
  8  | const LANGS = [
  9  |   { lang: 'en', dir: 'ltr' },
  10 |   { lang: 'fr', dir: 'ltr' },
  11 |   { lang: 'ar', dir: 'rtl' },
  12 | ] as const;
  13 | const WIDTHS = [
  14 |   { width: 375, height: 812 },
  15 |   { width: 1280, height: 800 },
  16 | ];
  17 | 
  18 | async function signedOut(page: Page, lang: string) {
  19 |   await page.addInitScript((l) => localStorage.setItem('erp.web.language', l), lang);
  20 |   await page.route('**/api/v1/**', (route) =>
  21 |     route.fulfill({
  22 |       status: route.request().method() === 'OPTIONS' ? 204 : 401,
  23 |       headers: { 'access-control-allow-origin': new URL(page.url() || 'http://127.0.0.1:4173').origin, 'access-control-allow-credentials': 'true' },
  24 |       contentType: 'application/json',
  25 |       body: JSON.stringify({ message: 'Not signed in' }),
  26 |     }),
  27 |   );
  28 | }
  29 | 
  30 | for (const { lang, dir } of LANGS) {
  31 |   for (const size of WIDTHS) {
  32 |     test(`sign-in, ${lang}, ${size.width} px: direction, one heading, no sideways scroll, WCAG AA`, async ({ page }) => {
  33 |       const errors: string[] = [];
  34 |       page.on('pageerror', (e) => errors.push(e.message));
  35 |       await page.setViewportSize(size);
  36 |       await signedOut(page, lang);
  37 |       await page.goto('/admin');
  38 |       await expect(page.locator('input[type="password"]')).toBeVisible();
  39 |       await expect(page.locator('html')).toHaveAttribute('dir', dir);
  40 |       await expect(page.locator('html')).toHaveAttribute('lang', lang);
  41 |       await expect(page.locator('h1')).toHaveCount(1);
  42 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  43 |       const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  44 |       expect(axe.violations.map((v) => v.id)).toEqual([]);
  45 |       expect(errors).toEqual([]);
  46 |     });
  47 |   }
  48 | 
  49 |   test(`an address of the customers is an unknown page here, ${lang}`, async ({ page }) => {
  50 |     await signedOut(page, lang);
  51 |     for (const path of ['/subscription', '/subscription/plan', '/join', '/account', '/about']) {
  52 |       const answer = await page.goto(path);
  53 |       expect(answer?.status(), path).toBe(404);
  54 |       await expect(page.locator('html')).toHaveAttribute('dir', dir);
  55 |       await expect(page.locator(`a[href="/admin"].btn`)).toBeVisible();
  56 |       await expect(page.locator('input[type="password"]')).toHaveCount(0);
  57 |     }
  58 |   });
  59 | }
  60 | 
  61 | test('the root leads to the console, and its console routes are served', async ({ page }) => {
  62 |   await signedOut(page, 'en');
  63 |   await page.goto('/');
  64 |   await expect(page).toHaveURL(/\/admin$/);
  65 |   expect((await page.goto('/admin/proofs'))?.status()).toBe(200);
  66 |   await expect(page.locator('input[type="password"]')).toBeVisible();
  67 | });
  68 | 
  69 | test('every page says noindex and carries the policy; no source map is served', async ({ request }) => {
  70 |   for (const path of ['/', '/admin', '/admin/proofs', '/nowhere']) {
  71 |     const headers = (await request.get(path, { maxRedirects: 0 })).headers();
> 72 |     expect(headers['x-robots-tag'], path).toContain('noindex');
     |                                           ^ Error: expect(received).toContain(expected) // indexOf
  73 |     expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
  74 |   }
  75 |   expect(await (await request.get('/robots.txt')).text()).toBe('User-agent: *\nDisallow: /\n');
  76 |   expect((await request.get('/sitemap.xml')).status()).toBe(404);
  77 | });
  78 | 
```