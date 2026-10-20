// Console (D217) in a real browser against the disposable API: sign-in with the second factor, then the new
// provisioning pages in EN/FR/AR × light/dark × 320/393/1280, with layout checks; and the create → setup code flow.
// Screenshots mask the setup code. Prints facts only: never a password, a code or a secret.
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = process.env.WORK ? `${process.env.WORK}/` : new URL('.', import.meta.url).pathname;
// Playwright from the console checkout (PW_FROM); WebKit when BROWSER=webkit — automation on Linux, not an iPhone.
const require = createRequire(process.env.PW_FROM ?? `${DIR}../web-int/package.json`);
const playwright = require('@playwright/test');
const chromium = process.env.BROWSER === 'webkit' ? playwright.webkit : playwright.chromium;

const SITE = process.env.SITE ?? 'http://127.0.0.1:4310';
const API = process.env.API ?? 'http://127.0.0.1:3410/api/v1';
const ADMIN_PW = readFileSync(`${DIR}admin.pw`, 'utf8').trim();
const SECRET = readFileSync(`${DIR}totp.secret`, 'utf8').trim();
const OUT = `${DIR}ui-shots/console`;
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (what, ok, detail = '') => {
  results.push({ what, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`);
};

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32(text) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of text.toUpperCase().replace(/[\s=-]/g, '')) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function totp(step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', b32(SECRET)).update(counter).digest();
  const o = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3];
  return String(bin % 1e6).padStart(6, '0');
}
// Each step is usable once (0094): wait for a step nobody used yet. The journeys used the steps before this run.
let lastStep = Math.floor(Date.now() / 30000);
async function freshCode() {
  for (;;) {
    const step = Math.floor(Date.now() / 30000);
    if (step > lastStep && Date.now() % 30000 < 27000) {
      lastStep = step;
      return totp(step);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

const browser = await chromium.launch();
const consoleErrors = [];
const serverNotes = new Set();
async function newPage({ lang = 'en', theme = 'light', width = 393, state } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width >= 1000 ? 900 : 800 },
    colorScheme: theme,
    storageState: state,
  });
  await context.addInitScript(([l, t]) => {
    try {
      localStorage.setItem('erp.web.language', l);
      localStorage.setItem('erp.web.theme', t);
    } catch {}
  }, [lang, theme]);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${lang}/${theme}/${width}: ${m.text().slice(0, 160)}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`${lang}/${theme}/${width}: ${String(e).slice(0, 160)}`));
  return { context, page };
}

// ── Sign in once: password, then a code ─────────────────────────────────────────────────────────────────────────────
const { context: signCtx, page } = await newPage();
await page.goto(`${SITE}/admin`);
await page.getByLabel(/email/i).fill('ops@example.test');
await page.getByLabel(/password/i).fill(ADMIN_PW);
await page.getByRole('button', { name: /sign in/i }).click();
const codeBox = page.locator('input[autocomplete="one-time-code"]');
await codeBox.waitFor();
check('the password alone leads to the second factor, not the console', (await page.locator('nav[aria-label="platform"]').count()) === 0);
await page.screenshot({ path: `${OUT}/signin-second-factor-en-393.png`, fullPage: true });
await codeBox.fill(await freshCode());
await page.getByRole('button', { name: /^continue$/i }).click();
await page.locator('nav[aria-label="platform"]').waitFor();
check('with the code, the console opens', true);
const state = await signCtx.storageState();

// The businesses the journeys made, read the way the console reads them.
const list = await page.evaluate(async (api) => (await fetch(`${api}/platform/businesses`, { credentials: 'include' })).json(), API);
const rows = Array.isArray(list) ? list : list.rows ?? [];
const lab = rows.find((r) => /Labo Test/i.test(r.name ?? r.businessName ?? '') && !/Atar/.test(r.name ?? ''));
const atar = rows.find((r) => /Atar/.test(r.name ?? r.businessName ?? ''));
check('the console lists the two test businesses', !!lab && !!atar, `${rows.length} rows`);

// ── Create a test business through the form: step-up, setup code shown once, never stored ─────────────────────────
await page.goto(`${SITE}/admin/businesses/new`);
await page.getByRole('heading', { level: 1 }).waitFor();
check('the new-business form starts as a test business', await page.locator('input[type=checkbox]').first().isChecked());
const inputs = page.locator('form.card input:not([type=checkbox])');
await inputs.nth(0).fill('Atelier Test Nouadhibou');
await inputs.nth(1).fill('Aminetou Test');
await inputs.nth(2).fill(`+2224${String(Date.now()).slice(-7)}`);
await inputs.nth(5).fill('Boutique Port');
await page.locator('form.card input[maxlength="500"]').fill('Browser check (D217)');
await page.screenshot({ path: `${OUT}/new-business-filled-en-393.png`, fullPage: true });
await page.getByRole('button', { name: /create the business/i }).click();
const dialog = page.locator('dialog.modal');
await dialog.locator('input[type=password]').fill(ADMIN_PW);
await dialog.locator('input[autocomplete="one-time-code"]').fill(await freshCode());
await dialog.getByRole('button', { name: /confirm/i }).click();
const code = page.getByTestId('setup-code');
await code.waitFor({ timeout: 15000 });
const token = (await code.innerText()).trim();
check('the setup code is shown once after creation', token.length >= 16, `${token.length} characters`);
check('the setup code is not in the address', !page.url().includes(token));
const stored = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
check('the setup code is in neither localStorage nor sessionStorage', !stored.includes(token));
await page.screenshot({ path: `${OUT}/new-business-setup-code-en-393.png`, fullPage: true, mask: [code] });
await page.getByRole('button', { name: /handed it over/i }).click();
check('“I have handed it over” removes the code from the page', (await page.getByTestId('setup-code').count()) === 0 && !(await page.content()).includes(token));
await page.getByRole('link', { name: /open the business/i }).click();
await page.getByRole('heading', { level: 1 }).waitFor();
const newId = page.url().split('/').pop();
await page.waitForTimeout(500);
const detailText = await page.locator('main').innerText();
check('the new business reads awaiting the Owner’s setup, number unverified', /waiting for the owner/i.test(detailText) && /not verified/i.test(detailText));
await page.screenshot({ path: `${OUT}/business-awaiting-setup-en-393.png`, fullPage: true });

// A reload of a deep link stays on the page (SPA rewrite) and the code is gone for good.
await page.reload();
await page.getByRole('heading', { level: 1 }).waitFor();
check('reloading the business page keeps it, and shows no code', page.url().endsWith(newId) && (await page.getByTestId('setup-code').count()) === 0);

// Reissue: a new code; the old one is revoked.
await page.getByRole('button', { name: /new setup code|reissue/i }).click();
await dialog.locator('input[type=password]').fill(ADMIN_PW);
await dialog.locator('input[autocomplete="one-time-code"]').fill(await freshCode());
await dialog.getByRole('button', { name: /confirm/i }).click();
await code.waitFor({ timeout: 15000 });
const token2 = (await code.innerText()).trim();
check('a reissued code is a different code', token2.length >= 16 && token2 !== token);
const oldCode = await fetch(`${API}/auth/owner-setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: randomUUID() }) });
check('the first code no longer works once reissued', oldCode.status === 400, `status ${oldCode.status}`);
await page.getByRole('button', { name: /handed it over/i }).click();

// A store for a test business without a grant: the form says the grant is needed and does not submit.
const storeBtn = page.getByRole('button', { name: /add the store/i });
check('a test business without a grant cannot open a store from the console', (await storeBtn.count()) === 1 && (await storeBtn.isDisabled()));
await signCtx.close();

// ── The matrix: pages × languages × themes × widths ───────────────────────────────────────────────────────────────
const PAGES = [
  ['dashboard', '/admin'],
  ['businesses', '/admin/businesses'],
  ['new', '/admin/businesses/new'],
  ['lab', `/admin/businesses/${lab?.id}`],
  ['awaiting', `/admin/businesses/${newId}`],
];
const BADGE = { en: 'Test', fr: 'Test', ar: 'اختباري' };
for (const lang of ['en', 'fr', 'ar']) {
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 393, 1280]) {
      const { context, page: p } = await newPage({ lang, theme, width, state });
      for (const [name, path] of PAGES) {
        await p.goto(`${SITE}${path}`);
        await p.getByRole('heading', { level: 1 }).first().waitFor();
        await p.waitForLoadState('networkidle');
        const facts = await p.evaluate(() => ({
          dir: document.documentElement.dir,
          lang: document.documentElement.lang,
          theme: document.documentElement.dataset.theme,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          text: document.body.innerText,
        }));
        const where = `${name} ${lang}/${theme}/${width}`;
        const problems = [];
        if (facts.dir !== (lang === 'ar' ? 'rtl' : 'ltr')) problems.push(`dir ${facts.dir}`);
        if (facts.lang !== lang) problems.push(`lang ${facts.lang}`);
        if (facts.theme && facts.theme !== theme) problems.push(`theme ${facts.theme}`);
        if (facts.overflow > 1) problems.push(`horizontal overflow ${facts.overflow}px`);
        // The timeline's notes are free text the server recorded, in English, as every timeline note is (the existing
        // "Created by the platform for the shop…" included): reported apart, not as a missing translation.
        const SERVER_NOTE = 'Test business created by the platform. Awaiting access.';
        if (facts.text.includes(SERVER_NOTE)) serverNotes.add(where);
        facts.text = facts.text.replaceAll(SERVER_NOTE, '');
        const raw = facts.text.match(/\badmin\.[a-zA-Z]+(\.[a-zA-Z_]+)+/);
        if (raw) problems.push(`untranslated key ${raw[0]}`);
        if (name !== 'new' && name !== 'dashboard' && !facts.text.includes(BADGE[lang])) problems.push('no test badge');
        if (lang !== 'en' && /(Waiting for the Owner|Issue a new setup code|Test business|Add the store|Create the business)/.test(facts.text)) problems.push('English text left in');
        check(`layout ${where}`, problems.length === 0, problems.join('; '));
        if (width !== 1280 || name === 'lab') await p.screenshot({ path: `${OUT}/${name}-${lang}-${theme}-${width}.png`, fullPage: true });
      }
      await context.close();
    }
  }
}

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (consoleErrors.length) console.log(`browser console errors (${consoleErrors.length}):\n  ${[...new Set(consoleErrors)].slice(0, 12).join('\n  ')}`);
console.log(`server-recorded English timeline note seen on ${serverNotes.size} page renders (existing convention)`);
writeFileSync(`${DIR}ui-console.json`, JSON.stringify({ at: new Date().toISOString(), results, consoleErrors }, null, 2));
process.exitCode = passed === results.length ? 0 : 1;
