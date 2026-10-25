// Promoter attribution and user invitations (0103, D221), end to end against a real API on real MySQL, in a browser.
// Prints facts only: never a password, a TOTP key, a token or a full number. Everything is disposable.
//
// A. The console: sign in with the second factor, create a promoter, generate the code and QR (step-up), the card in
//    EN/AR/FR, light/dark, 375/320 px and desktop — no number or note on it — and its PNG download; regenerate (the old
//    code and QR stop at once); deactivate and activate.
// B. The registration link's landing on the site: the token out of the address, the promoter named, the form prefilled.
// C. The app's registration from the QR address (as the portal's "Create my business" opens it): attributed by QR.
// D. The app's registration with a code typed in Arabic digits, Arabic, dark, 320 px: attributed by code.
// E. A code deactivated between its check and the submission: refused, nothing saved, the person told.
// F. A business's invitation through the app's /join: attributed to the inviting business.
// G. The report's counts; then the enumeration limit: five wrong guesses, then even a real code is refused.
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { API, APP, BROWSER, OUT, WORK, adminPassword, call, check, engine, results, finish, freshCode } from './lib.mjs';

const WEB = process.env.WEB ?? 'http://127.0.0.1:4173';
const WEBDIR = process.env.WEBDIR;
const APPDIR = process.env.APPDIR;
const NUMBER = '+22236001122';
const NOTE = 'Met at the Capitale market';
const NAME = 'Sidi Mohamed Ould Ahmed';

const web = { en: (await import(`${WEBDIR}/src/i18n/en.ts`)).en, ar: (await import(`${WEBDIR}/src/i18n/ar.ts`)).ar, fr: (await import(`${WEBDIR}/src/i18n/fr.ts`)).fr };
const app = { en: (await import(`${APPDIR}/lib/i18n/en.ts`)).en, ar: (await import(`${APPDIR}/lib/i18n/ar.ts`)).ar };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

// ── The database, read as root (fixtures for F, and the facts the checks assert) ─────────────────────────────────────
function sql(query) {
  return execFileSync('mysql', [...(process.env.MYSQL_ARGS ?? '-h 127.0.0.1 -P 3306 --protocol=TCP -u root').split(' '), '-N', '-B', process.env.DB ?? 'sa_e2e', '-e', query], { encoding: 'utf8' }).replace(/\n$/, '');
}
const acquisitionOf = (business) =>
  sql(`SELECT a.source, a.mechanism, IFNULL(a.code_version, ''), IFNULL(a.promoter_name, ''), IFNULL(HEX(a.inviter_company_id), '') FROM business_acquisitions a JOIN companies c ON c.id = a.company_id WHERE c.name = '${business}'`);
const companies = () => Number(sql('SELECT COUNT(*) FROM companies'));

// ── The registration link's token for an invitation row, signed as the server signs it ───────────────────────────────
function inviteToken(key, ref) {
  const body = Buffer.alloc(21);
  body[0] = 2;
  ref.copy(body, 1);
  const mac = createHmac('sha256', key).update('dukan-erp/user-invite/v1').update('\n').update(body).digest().subarray(0, 16);
  return Buffer.concat([body, mac]).toString('base64url');
}

// ── The administrator over HTTP, for reads the page does not print (the QR's address) ───────────────────────────────
const secret = readFileSync(`${WORK}totp.secret`, 'utf8').trim();
async function adminCookie() {
  const s = await call('POST', 'platform/admin/sign-in', { body: { email: 'ops@example.test', password: adminPassword() } });
  const cookie = s.setCookie.map((c) => c.split(';')[0]).join('; ');
  const v = await call('POST', 'platform/admin/mfa/verify', { cookie, admin: true, body: { code: await freshCode(secret) } });
  if (v.status !== 200) throw new Error(`mfa verify ${v.status}`);
  return cookie;
}

const browser = await engine.launch();
const consoleErrors = [];
// WebKit reports two style refusals that are not the page's own styles, each recorded with its source:
//  - `style-src-attr` raised where React creates a SELECT: WebKit styling its own control (the application form's
//    existing select does the same). WebKit names the target SELECT, or the document when the element is not yet
//    attached, so a refusal counts here only from the exact source position that also refused on a SELECT;
//  - `style-src-elem` from a script with no source file: what Playwright injects to take a screenshot.
// Any other refusal — or a refusal no violation explains — still fails.
const cspViolations = [];
let cspRefusals = 0;
const SELECT_STYLE = / style-src-attr blocked=inline source=(\S+\/assets\/index-\S+) sample= element=(SELECT|#document)$/;
const engineOrTooling = (v, selectSources) =>
  selectSources.has(SELECT_STYLE.exec(v.text)?.[1]) || / style-src-elem blocked=inline source=:\d+:\d+ sample= element=#document$/.test(v.text);
async function newPage({ lang = 'en', theme = 'light', width = 1280 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width <= 375 ? 760 : 900 }, colorScheme: theme, acceptDownloads: true });
  await context.addInitScript(([l, t]) => {
    try {
      localStorage.setItem('erp.web.language', l);
      localStorage.setItem('erp.web.theme', t);
      localStorage.setItem('erp.language', l);
      localStorage.setItem('erp.theme', t);
    } catch {}
  }, [lang, theme]);
  // What a policy refused, and from where — a refusal is otherwise a bare sentence in the console.
  await context.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (e) =>
      console.warn(`csp-violation ${e.effectiveDirective} blocked=${e.blockedURI} source=${e.sourceFile}:${e.lineNumber}:${e.columnNumber} sample=${(e.sample || '').slice(0, 80)} element=${e.target?.nodeName ?? ''}`),
    ),
  );
  const page = await context.newPage();
  const where = () => `${new URL(page.url()).origin === WEB ? 'site' : 'app'} ${new URL(page.url()).pathname} (after "${results.at(-1)?.what ?? 'start'}")`;
  page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().startsWith('csp-violation')) {
      console.log(`      ${where()}: ${m.text()}`);
      cspViolations.push({ at: where(), text: m.text() });
    }
    if (m.type() === 'error' && /^Refused to apply a stylesheet/.test(m.text())) cspRefusals += 1;
    else if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(`${where()}: ${m.text().slice(0, 120)} at ${m.location().url}:${m.location().lineNumber}`);
  });
  return page;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
// `caret: 'initial'`: hiding the caret makes Playwright insert a <style>, which the site's CSP (style-src 'self')
// rightly refuses in WebKit — a console error of the tooling's own, not the page's.
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 70, fullPage: true, caret: 'initial' });

async function stepUp(page) {
  const dialog = page.locator('dialog[open]').filter({ hasText: web.en['admin.stepup.title'] });
  await dialog.getByLabel(web.en['admin.password']).fill(adminPassword());
  await dialog.getByLabel(web.en['admin.mfa.code']).fill(await freshCode(secret));
  await dialog.getByRole('button', { name: web.en['action.confirm'] }).click();
}

// ── A. The console ──────────────────────────────────────────────────────────────────────────────────────────────────
const admin = await newPage();
await admin.goto(`${WEB}/admin`);
await admin.getByLabel(web.en['admin.email']).fill('ops@example.test');
await admin.getByLabel(web.en['admin.password']).fill(adminPassword());
await admin.getByRole('button', { name: web.en['action.signIn'] }).click();
await admin.getByLabel(web.en['admin.mfa.code']).fill(await freshCode(secret));
await admin.getByRole('button', { name: web.en['admin.mfa.verify'] }).click();
await admin.getByRole('link', { name: web.en['admin.nav.promoters'] }).click();
await admin.getByRole('heading', { name: web.en['admin.promoters.title'] }).waitFor();
check('the console signs in with the second factor and opens Promoters', new URL(admin.url()).pathname === '/admin/promoters');

await admin.getByRole('button', { name: web.en['admin.promoters.new'] }).click();
await admin.getByLabel(new RegExp(`^${web.en['admin.promoters.name']}`)).fill(NAME);
await admin.getByLabel(new RegExp(`^${web.en['admin.promoters.number']}`)).fill('36 00 11 22');
await admin.getByLabel(/^Private note/).fill(NOTE);
await admin.getByRole('button', { name: web.en['admin.promoters.create'] }).click();
await stepUp(admin);
await admin.getByRole('button', { name: web.en['admin.promoter.generate'] }).waitFor();
check('a new promoter has no code until "Generate code and QR" is pressed', (await admin.locator('.code-big').count()) === 0);
const promoterId = new URL(admin.url()).pathname.split('/').pop();
check('the promoter’s page shows the full number to the administrator', (await admin.locator('body').innerText()).includes(NUMBER));

await admin.getByRole('button', { name: web.en['admin.promoter.generate'] }).click();
await stepUp(admin);
await admin.getByTestId('promoter-card').waitFor();
const code1 = (await admin.locator('.code-big').innerText()).trim();
check('the server drew a six-digit code', /^[0-9]{6}$/.test(code1));
const cookie = await adminCookie();
const detail1 = (await call('GET', `platform/promoters/${promoterId}`, { cookie })).json;
const token1 = new URL(detail1.qrLink).searchParams.get('r');
check('the QR address is <portal>/join?r=<50-character token>', /^https:\/\/dukan\.example\.test\/join\?r=[A-Za-z0-9_-]{50}$/.test(detail1.qrLink));
check('the token carries no id, number, code or name', !token1.includes(promoterId.replace(/-/g, '')) && !token1.includes(code1) && !token1.includes('2223600'));

const cardText = await admin.getByTestId('promoter-card').innerText();
check('the card shows the brand, the name, the code and the instruction', ['Dukan ERP', NAME, code1, web.en['card.instruction']].every((s) => cardText.includes(s)));
check('the card never shows the number or the note', !cardText.includes(NUMBER) && !cardText.includes('36 00 11 22') && !cardText.includes(NOTE));
const [download] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: web.en['admin.promoter.download'] }).click()]);
const png = readFileSync(await download.path());
check('the card downloads as a PNG', png.subarray(1, 4).toString() === 'PNG' && png.length > 10_000, `${png.length} bytes`);
await shot(admin, 'console-promoter-en-light-1280');

for (const [lang, theme, width] of [['ar', 'dark', 375], ['fr', 'light', 320], ['en', 'dark', 320]]) {
  const p = await newPage({ lang, theme, width });
  await p.goto(`${WEB}/admin/promoters/${promoterId}`);
  // A new context: sign in again (each has its own session cookie).
  await p.getByLabel(web[lang]['admin.email']).fill('ops@example.test');
  await p.getByLabel(web[lang]['admin.password']).fill(adminPassword());
  await p.getByRole('button', { name: web[lang]['action.signIn'] }).click();
  await p.getByLabel(web[lang]['admin.mfa.code']).fill(await freshCode(secret));
  await p.getByRole('button', { name: web[lang]['admin.mfa.verify'] }).click();
  await p.getByTestId('promoter-card').waitFor();
  await p.getByLabel(web[lang]['admin.promoter.card.language']).selectOption(lang);
  const dir = await p.getByTestId('promoter-card').getAttribute('dir');
  check(`the promoter’s page in ${lang}, ${theme}, at ${width} px: no sideways scroll, the card ${lang === 'ar' ? 'right to left' : 'left to right'}`, (await overflow(p)) <= 0 && dir === (lang === 'ar' ? 'rtl' : 'ltr'));
  await shot(p, `console-promoter-${lang}-${theme}-${width}`);
  await p.goto(`${WEB}/admin/promoters`);
  await p.getByText(NAME).first().waitFor();
  const list = await p.locator('body').innerText();
  check(`the list in ${lang} masks the number`, list.includes('+222***22') && !list.includes(NUMBER));
  await shot(p, `console-promoters-${lang}-${theme}-${width}`);
  await p.context().close();
}

// Regenerate: what it does first, then the step-up; the old code and QR stop at once.
await admin.getByRole('button', { name: web.en['admin.promoter.regenerate'] }).click();
await admin.getByRole('button', { name: web.en['admin.promoter.regenerate.confirm'] }).click();
await stepUp(admin);
await admin.waitForFunction((old) => document.querySelector('.code-big')?.textContent?.trim() !== old, code1);
const code2 = (await admin.locator('.code-big').innerText()).trim();
const token2 = new URL((await call('GET', `platform/promoters/${promoterId}`, { cookie })).json.qrLink).searchParams.get('r');
const oldCode = await call('POST', 'auth/acquisition/code', { body: { code: code1 }, ip: '203.0.113.11' });
const oldLink = await call('POST', 'auth/acquisition/link', { body: { token: token1 }, ip: '203.0.113.12' });
const newLink = await call('POST', 'auth/acquisition/link', { body: { token: token2 }, ip: '203.0.113.13' });
check('regenerating gives a new code and a new QR', code2 !== code1 && token2 !== token1);
check('the old code and the old QR answer only "unusable"', JSON.stringify(oldCode.json) === '{"usable":false}' && JSON.stringify(oldLink.json) === '{"usable":false}');
check('the new QR names the promoter and prefills the new code — nothing else', JSON.stringify(newLink.json) === JSON.stringify({ usable: true, source: 'promoter', promoterName: NAME, code: code2 }));
check('the history keeps both codes', (await admin.locator('body').innerText()).includes(code1));

// ── B. The registration link's landing on the site ─────────────────────────────────────────────────────────────────
for (const [lang, theme, width] of [['en', 'light', 375], ['ar', 'dark', 320]]) {
  const p = await newPage({ lang, theme, width });
  await p.goto(`${WEB}/join?r=${token2}`);
  await p.getByText(fill(web[lang]['promo.from'], { name: NAME })).waitFor();
  check(`/join in ${lang}: the token leaves the address, the promoter is named, no sideways scroll`, new URL(p.url()).search === '' && (await overflow(p)) <= 0);
  const robots = await p.locator('meta[name="robots"]').getAttribute('content');
  check(`/join in ${lang} is never indexed`, robots === 'noindex, nofollow');
  await shot(p, `join-${lang}-${theme}-${width}`);
  if (lang === 'en') {
    await p.getByRole('link', { name: web.en['join.continue'] }).click();
    await p.waitForURL(/\/apply$/);
    await p.waitForFunction((c) => [...document.querySelectorAll('.code-box')].map((e) => e.value).join('') === c, code2, { timeout: 10_000 }).catch(() => undefined);
    const digits = await p.locator('.code-box').evaluateAll((els) => els.map((e) => e.value).join(''));
    check('the application form opens with the code prefilled, in memory', digits === code2 && new URL(p.url()).search === '');
    await shot(p, 'apply-prefilled-en-375');
  }
  await p.context().close();
}

// ── The app's registration, step by step ────────────────────────────────────────────────────────────────────────────
async function register(p, lang, business, { submit = true } = {}) {
  const c = app[lang];
  const fields = () => p.locator('input[data-app-field="true"]:visible');
  await fields().nth(0).fill(business);
  await fields().nth(1).fill('Main');
  await p.getByText(c['register.next'], { exact: true }).click();
  await fields().nth(0).fill('Owner Test');
  await p.getByText(c['register.next'], { exact: true }).click();
  await fields().nth(0).fill(`+2223${String(Date.now()).slice(-7)}`);
  // The box is shown once the server's consent copy has arrived; a tick before that does not take, and the app rightly
  // sends nothing. Tick it when it is there, and go on only once it is ticked.
  const consent = p.getByTestId('whatsapp-consent-check');
  await consent.waitFor();
  for (let i = 0; i < 20 && (await consent.getAttribute('aria-checked')) !== 'true'; i++) {
    if ((await consent.getAttribute('aria-disabled')) !== 'true') await consent.click();
    await p.waitForTimeout(250);
  }
  await fields().nth(2).fill('a-long-password');
  await fields().nth(3).fill('a-long-password');
  if (submit) await p.getByText(c['register.submit'], { exact: true }).click();
}

/** The code check, or a screenshot of what the person saw instead. */
async function toCodeCheck(p, name) {
  try {
    await p.waitForURL(/verify/, { timeout: 30_000 });
  } catch (e) {
    await shot(p, `${name}-not-sent`);
    throw e;
  }
}

// ── C. From the QR address, as the portal's "Create my business" opens the app ──────────────────────────────────────
{
  const p = await newPage({ width: 390 });
  await p.goto(`${APP}/register?r=${token2}`);
  await p.getByText(fill(app.en['register.promo.from'], { name: NAME })).waitFor();
  check('the app’s registration names the promoter from the QR and takes the token out of the address', !p.url().includes('r='));
  await shot(p, 'app-register-qr-en-390');
  await register(p, 'en', 'QR Shop Test');
  await toCodeCheck(p, 'app-register-qr');
  check('registered from the QR: one attribution, by QR, version 2, the name as it was', acquisitionOf('QR Shop Test') === `promoter\tpromoter_qr\t2\t${NAME}\t`);
  await p.context().close();
}

// ── D. A code typed in Arabic digits, in Arabic, dark, at 320 px ────────────────────────────────────────────────────
{
  const p = await newPage({ lang: 'ar', theme: 'dark', width: 320 });
  await p.goto(`${APP}/register`);
  await p.getByTestId('promo-digit-1').click();
  await p.keyboard.insertText(code2.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d))));
  await p.getByText(fill(app.ar['register.promo.from'], { name: NAME })).waitFor();
  const boxes = await p.locator('[data-testid^="promo-digit-"]').evaluateAll((els) => els.map((e) => [e.value, Math.round(e.getBoundingClientRect().left)]));
  check('Arabic digits are read as the code, left to right in an Arabic page', boxes.map((b) => b[0]).join('') === code2 && boxes.every((b, i) => i === 0 || b[1] > boxes[i - 1][1]));
  check('the registration at 320 px in Arabic: no sideways scroll', (await overflow(p)) <= 0);
  await shot(p, 'app-register-code-ar-dark-320');
  await register(p, 'ar', 'Code Shop Test');
  await toCodeCheck(p, 'app-register-code');
  check('registered with the typed code: attributed by code', acquisitionOf('Code Shop Test') === `promoter\tpromo_code\t2\t${NAME}\t`);
  await p.context().close();
}

// ── E. Deactivated between the check and the submission ─────────────────────────────────────────────────────────────
{
  const p = await newPage({ width: 375 });
  await p.goto(`${APP}/register`);
  await p.getByTestId('promo-digit-1').click();
  await p.keyboard.insertText(code2);
  await p.getByText(fill(app.en['register.promo.from'], { name: NAME })).waitFor();
  await register(p, 'en', 'Refused Shop Test', { submit: false });
  await admin.getByRole('button', { name: web.en['admin.promoter.deactivate'] }).click();
  await stepUp(admin);
  await admin.getByText(web.en['admin.promoter.inactive.notice']).waitFor();
  const before = companies();
  await p.getByText(app.en['register.submit'], { exact: true }).click();
  await p.getByText(app.en['register.promo.unavailableNow']).waitFor();
  check('a code deactivated after its check refuses the registration, and nothing is saved', companies() === before && acquisitionOf('Refused Shop Test') === '');
  await shot(p, 'app-register-refused-en-375');
  const deactivated = await call('POST', 'auth/acquisition/code', { body: { code: code2 }, ip: '203.0.113.14' });
  check('a deactivated code answers only "unusable"', JSON.stringify(deactivated.json) === '{"usable":false}');
  await admin.getByRole('button', { name: web.en['admin.promoter.activate'] }).click();
  await stepUp(admin);
  await admin.getByRole('button', { name: web.en['admin.promoter.deactivate'] }).waitFor();
  const again = await call('POST', 'auth/acquisition/code', { body: { code: code2 }, ip: '203.0.113.15' });
  check('activated again, the same code opens again', again.json?.usable === true);
  await p.context().close();
}

// ── F. A business's invitation, through the app's /join ─────────────────────────────────────────────────────────────
{
  const inviter = sql("SELECT HEX(c.id), HEX(u.id) FROM companies c JOIN users u ON u.company_id = c.id WHERE c.name = 'QR Shop Test' LIMIT 1").split('\t');
  const ref = randomBytes(16);
  sql(`INSERT INTO referral_invitations (id, public_ref, company_id, created_by_user_id, language) VALUES (UNHEX(REPLACE(UUID(), '-', '')), UNHEX('${ref.toString('hex')}'), UNHEX('${inviter[0]}'), UNHEX('${inviter[1]}'), 'en')`);
  const key = readFileSync(`${WORK}api.env`, 'utf8').match(/^REFERRAL_KEY=(.+)$/m)[1];
  const token = inviteToken(key, ref);
  const p = await newPage({ width: 390 });
  await p.goto(`${APP}/join?r=${token}`);
  await p.getByText(app.en['register.promo.invited']).waitFor();
  check('the app’s /join hands a registration address to registration (not the team’s join)', p.url().includes('register') && !p.url().includes('r='));
  await shot(p, 'app-register-invited-en-390');
  await register(p, 'en', 'Invited Shop Test');
  await toCodeCheck(p, 'app-register-invited');
  check('registered from an invitation: attributed to the inviting business', acquisitionOf('Invited Shop Test') === `user_invite\tuser_invite\t\t\t${inviter[0]}`);
  await p.context().close();
}

// ── G. The report, then the enumeration limit ───────────────────────────────────────────────────────────────────────
const summary = (await call('GET', 'platform/acquisitions/summary', { cookie })).json;
check('the report counts two promoter registrations and one invitation', summary.promoter === 2 && summary.userInvite === 1, JSON.stringify(summary));
const listed = (await call('GET', `platform/promoters?q=${code2}`, { cookie })).json;
check('the list counts the promoter’s registrations', listed.rows[0]?.registrations === 2 && !JSON.stringify(listed).includes(NUMBER));

// The enumeration limit, from one fresh address (the trusted proxy's X-Forwarded-For): five wrong guesses are
// answered, each the one identical "unusable"; the sixth lookup — a real code — is refused, on both doors.
const GUESSER = '203.0.113.99';
const answers = [];
for (let i = 0; i < 5; i++) answers.push(await call('POST', 'auth/acquisition/code', { body: { code: String((Number(code2) + 1 + i) % 1e6).padStart(6, '0') }, ip: GUESSER }));
const stopped = await call('POST', 'auth/acquisition/code', { body: { code: code2 }, ip: GUESSER });
const otherDoor = await call('POST', 'platform/acquisition/link', { body: { token: token2 }, ip: GUESSER });
const elsewhere = await call('POST', 'auth/acquisition/code', { body: { code: code2 }, ip: '203.0.113.98' });
check('five wrong guesses each answer the one identical "unusable"', answers.every((a) => a.status === 200 && JSON.stringify(a.json) === '{"usable":false}'));
check('then even a real code is refused (429), so a hit cannot be told from a miss', stopped.status === 429 && stopped.json?.code === 'acquisition_lookup_limited');
check('and the website’s door is the same budget', otherDoor.status === 429);
check('another address is not affected', elsewhere.json?.usable === true);

check('no console error in any page', consoleErrors.length === 0, consoleErrors.join(' | '));
const selectSources = new Set(cspViolations.map((v) => SELECT_STYLE.exec(v.text)).filter((m) => m?.[2] === 'SELECT').map((m) => m[1]));
const unexplained = cspViolations.filter((v) => !engineOrTooling(v, selectSources));
check(
  'no style refused but the engine’s own select and the screenshot tool’s',
  unexplained.length === 0 && cspRefusals === cspViolations.length,
  `${cspViolations.length - unexplained.length} engine/tooling, ${unexplained.length} other, ${cspRefusals} refusals${unexplained.length ? ` — ${unexplained.map((v) => `${v.at}: ${v.text}`).join(' | ')}` : ''}`,
);
writeFileSync(`${WORK}promoter-journey-facts-${BROWSER}.json`, JSON.stringify({ codeVersions: [1, 2], summary }, null, 2));
await browser.close();
finish('promoter-journey');
