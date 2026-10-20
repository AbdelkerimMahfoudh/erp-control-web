// The app's side of D217 in a real browser (the web export, against the disposable API): an administrator makes a test
// business over HTTP; the Owner pastes the setup code in the app, chooses a password, signs in, and every screen says it
// is a test business — EN/FR/AR, light/dark, 320/393. Screenshots never show the code. Prints facts only.
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = process.env.WORK ? `${process.env.WORK}/` : new URL('.', import.meta.url).pathname;
// Playwright from the console checkout (PW_FROM); WebKit when BROWSER=webkit — automation on Linux, not an iPhone.
const require = createRequire(process.env.PW_FROM ?? `${DIR}../web-int/package.json`);
const playwright = require('@playwright/test');
const chromium = process.env.BROWSER === 'webkit' ? playwright.webkit : playwright.chromium;

const APP = process.env.APP ?? 'http://127.0.0.1:4320';
const API = process.env.API ?? 'http://127.0.0.1:3410/api/v1';
const ADMIN_PW = readFileSync(`${DIR}admin.pw`, 'utf8').trim();
const SECRET = readFileSync(`${DIR}totp.secret`, 'utf8').trim();
const OUT = `${DIR}ui-shots/app`;
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (what, ok, detail = '') => {
  results.push({ what, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`);
};

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32(t) {
  let bits = 0, v = 0;
  const o = [];
  for (const ch of t.toUpperCase()) {
    v = (v << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      o.push((v >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(o);
}
function totp(step) {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(step));
  const m = createHmac('sha1', b32(SECRET)).update(c).digest();
  const o = m[m.length - 1] & 15;
  return String((((m[o] & 127) << 24) | (m[o + 1] << 16) | (m[o + 2] << 8) | m[o + 3]) % 1e6).padStart(6, '0');
}
let lastStep = Math.floor(Date.now() / 30000);
async function freshCode() {
  for (;;) {
    const s = Math.floor(Date.now() / 30000);
    if (s > lastStep && Date.now() % 30000 < 27000) {
      lastStep = s;
      return totp(s);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// ── The administrator, over HTTP ───────────────────────────────────────────────────────────────────────────────────
let cookie = '';
async function admin(method, path, body) {
  const headers = { Accept: 'application/json', Cookie: cookie };
  if (body) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['x-requested-with'] = 'erp-control-web';
  const res = await fetch(`${API}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
async function stepUp() {
  const s = await admin('POST', 'platform/admin/step-up', { password: ADMIN_PW, code: await freshCode() });
  if (s.status >= 300) throw new Error(`step-up ${s.status}`);
}
await admin('POST', 'platform/admin/sign-in', { email: 'ops@example.test', password: ADMIN_PW });
await admin('POST', 'platform/admin/mfa/verify', { code: await freshCode() });
const phone = `+2224${String(Date.now()).slice(-7)}`;
await stepUp();
const made = await admin('POST', 'platform/businesses', {
  idempotencyKey: randomUUID(), ownerName: 'Khadija Test', businessName: 'Comptoir Test Rosso', phone, branchName: 'Rosso Centre',
  language: 'fr', isTest: true, reason: 'App browser check (D217)', confirmPassword: ADMIN_PW,
});
const SETUP = made.json?.invitation?.token;
const BUSINESS = made.json?.companyId;
check('the administrator makes a test business with a setup code', made.status === 201 && !!SETUP, `status ${made.status}`);

const browser = await chromium.launch();
const pageErrors = [];
async function newPage({ lang = 'en', theme = 'light', width = 393, state } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 852 }, locale: lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr-FR' : 'en-US', colorScheme: theme, storageState: state });
  await context.addInitScript(([l, t]) => {
    try {
      localStorage.setItem('erp.language', l);
      localStorage.setItem('erp.theme', t);
    } catch {}
  }, [lang, theme]);
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${lang}/${theme}/${width}: ${String(e).slice(0, 160)}`));
  return { context, page };
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// ── The setup screen: reached from sign-in, refuses an unknown code, accepts the real one pasted with spaces ───────
const { context: ctx, page } = await newPage();
await page.goto(`${APP}/login`);
await page.getByText('I have a setup code').click();
await page.getByText('Set up your business').first().waitFor();
check('“I have a setup code” on the sign-in screen opens the setup screen', page.url().endsWith('/setup'));
await page.screenshot({ path: `${OUT}/setup-empty-en-light-393.png`, fullPage: true });
const boxes = page.getByRole('textbox');
await boxes.nth(0).fill('not-a-real-setup-code-0000');
await boxes.nth(1).fill('a-good-password-1');
await page.getByText('Set my password').click();
await page.getByText('This setup code cannot be used').waitFor();
check('an unknown code reads the one refusal, in the app’s words', true);
// Pasted the way a message app hands it over: broken across lines, with spaces.
const pasted = `  ${SETUP.slice(0, 20)}\n ${SETUP.slice(20)}  `;
const OWNER_PW = `pw-${randomUUID()}`;
await boxes.nth(0).fill(pasted);
await boxes.nth(1).fill(OWNER_PW);
await page.screenshot({ path: `${OUT}/setup-filled-en-light-393.png`, fullPage: true, mask: [boxes.nth(0), boxes.nth(1)] });
await page.getByText('Set my password').click();
await page.getByText('your password is set').waitFor();
check('the pasted code (spaces and a line break) sets the Owner’s password', true);
const kept = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage }, url: location.href }));
check('the code is kept nowhere in the browser, nor in the address', !kept.includes(SETUP) && !kept.includes(SETUP.slice(0, 20)));
await page.screenshot({ path: `${OUT}/setup-done-en-light-393.png`, fullPage: true });
await page.getByText('Go to sign in').click();
await page.waitForURL(/\/login$/);

// ── Sign in: before access, then with an administrative grant ─────────────────────────────────────────────────────
await page.getByRole('textbox').nth(0).fill(phone);
await page.getByRole('textbox').nth(1).fill(OWNER_PW);
await page.getByRole('button', { name: 'Sign In' }).click();
const before = await page.getByText(/Test business — for testing only/).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
await page.waitForTimeout(1000);
check('signed in before any access: the test banner shows', before, `${new URL(page.url()).pathname} — ${(await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
await page.screenshot({ path: `${OUT}/signed-in-no-access-en-light-393.png`, fullPage: true });

await stepUp();
const grant = await admin('POST', `platform/businesses/${BUSINESS}/activate-grant`, { days: 30, reason: 'App browser check access', confirmPassword: ADMIN_PW });
check('the administrator gives an explicit grant', grant.status === 200 || grant.status === 201, `status ${grant.status}`);
await page.goto(`${APP}/`);
await page.getByText(/Test business — for testing only/).first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);
check('with access, the home screen shows the test banner', true, new URL(page.url()).pathname);
await page.screenshot({ path: `${OUT}/home-en-light-393.png`, fullPage: true });
const state = await ctx.storageState();
await ctx.close();

// ── The banner and the setup screen across languages, themes and widths ───────────────────────────────────────────
const BANNER = {
  en: 'Test business — for testing only',
  fr: 'Entreprise de test — pour les tests uniquement',
  ar: 'نشاط تجاري اختباري — للاختبار فقط',
};
const SETUP_TITLE = { en: 'Set up your business', fr: 'Configurer votre entreprise', ar: 'إعداد نشاطك التجاري' };
for (const lang of ['en', 'fr', 'ar']) {
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 393]) {
      const where = `${lang}/${theme}/${width}`;
      const signedIn = await newPage({ lang, theme, width, state });
      for (const [name, path] of [['home', '/'], ['stock', '/inventory'], ['more', '/more']]) {
        await signedIn.page.goto(`${APP}${path}`);
        const banner = signedIn.page.getByText(BANNER[lang]).first();
        const shown = await banner.waitFor({ timeout: 20000 }).then(() => true, () => false);
        await signedIn.page.waitForTimeout(800);
        const dir = await signedIn.page.evaluate(() => getComputedStyle(document.body).direction + '|' + document.documentElement.dir);
        const over = await overflow(signedIn.page);
        const problems = [];
        if (!shown) problems.push('no banner');
        if (over > 1) problems.push(`horizontal overflow ${over}px`);
        if (lang === 'ar' && !/rtl/.test(dir)) problems.push(`direction ${dir}`);
        check(`banner ${name} ${where}`, problems.length === 0, problems.join('; '));
        await signedIn.page.screenshot({ path: `${OUT}/${name}-${lang}-${theme}-${width}.png`, fullPage: true });
      }
      await signedIn.context.close();

      const anon = await newPage({ lang, theme, width });
      await anon.page.goto(`${APP}/setup`);
      const titled = await anon.page.getByText(SETUP_TITLE[lang]).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
      const over = await overflow(anon.page);
      check(`setup screen ${where}`, titled && over <= 1, `${titled ? '' : 'no title; '}${over > 1 ? `overflow ${over}px` : ''}`);
      await anon.page.screenshot({ path: `${OUT}/setup-${lang}-${theme}-${width}.png`, fullPage: true });
      await anon.context.close();
    }
  }
}

// A deep link to the setup screen reloads in place.
const deep = await newPage();
await deep.page.goto(`${APP}/setup`);
await deep.page.reload();
const stayed = await deep.page.getByText('Set up your business').first().waitFor({ timeout: 20000 }).then(() => true, () => false);
check('reloading /setup stays on the setup screen', stayed && deep.page.url().endsWith('/setup'));
await deep.context.close();

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (pageErrors.length) console.log(`page errors (${pageErrors.length}):\n  ${[...new Set(pageErrors)].slice(0, 10).join('\n  ')}`);
writeFileSync(`${DIR}ui-app.json`, JSON.stringify({ at: new Date().toISOString(), results, pageErrors }, null, 2));
process.exitCode = passed === results.length ? 0 : 1;
