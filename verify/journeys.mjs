// The 12 provisioning journeys (D217) over real HTTP against the disposable API (port 3410, database sa_e2e).
// Prints statuses and facts only: never a token, a password, a setup code or a TOTP secret.
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const API = process.env.API ?? 'http://127.0.0.1:3410/api/v1';
const DIR = process.env.WORK ? `${process.env.WORK}/` : new URL('.', import.meta.url).pathname;
const ADMIN_EMAIL = 'ops@example.test';
const ADMIN_PW = readFileSync(`${DIR}admin.pw`, 'utf8').trim();
const ENROL = readFileSync(`${DIR}enrol.out`, 'utf8').match(/^\s{4}(\S{24,})\s*$/m)?.[1];

const results = [];
const check = (journey, what, ok, detail = '') => {
  results.push({ journey, what, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  J${journey}  ${what}${detail ? ` — ${detail}` : ''}`);
};

// ── HTTP ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function call(method, path, { cookie, token, branch, body, admin } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (branch) headers['X-Branch-Id'] = branch;
  if (admin && method !== 'GET') headers['x-requested-with'] = 'erp-control-web';
  const res = await fetch(`${API}/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie?.() ?? [] };
}

// ── TOTP (RFC 6238, SHA-1, 30 s, 6 digits), for the disposable administrator only ──────────────────────────────────
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
function totp(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', b32(secret)).update(counter).digest();
  const o = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3];
  return String(bin % 1e6).padStart(6, '0');
}
let lastStep = -1;
async function freshCode(secret) {
  for (;;) {
    const step = Math.floor(Date.now() / 30000);
    if (step > lastStep) {
      lastStep = step;
      return totp(secret, step);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ── J1: the superadmin signs in, with every control ─────────────────────────────────────────────────────────────────
const signIn = await call('POST', 'platform/admin/sign-in', { body: { email: ADMIN_EMAIL, password: ADMIN_PW } });
const cookie = signIn.setCookie.map((c) => c.split(';')[0]).join('; ');
check(1, 'sign-in with the password sets an HttpOnly session cookie', signIn.status === 200 && /HttpOnly/i.test(signIn.setCookie.join(';')), `status ${signIn.status}`);
const beforeMfa = await call('GET', 'platform/dashboard', { cookie });
check(1, 'a password alone reaches nothing: the dashboard asks for the second factor', beforeMfa.status === 401 && beforeMfa.json?.code === 'mfa_required', `status ${beforeMfa.status} ${beforeMfa.json?.code ?? ''}`);
const enrol = await call('POST', 'platform/admin/mfa/enrolment/start', { cookie, admin: true, body: { enrolmentToken: ENROL } });
const SECRET = enrol.json?.secret;
if (SECRET) writeFileSync(`${DIR}totp.secret`, SECRET, { mode: 0o600 });
check(1, 'enrolment with the server-issued token returns the authenticator key once', enrol.status === 200 && !!SECRET, `status ${enrol.status}`);
const confirmed = await call('POST', 'platform/admin/mfa/enrolment/confirm', { cookie, admin: true, body: { code: await freshCode(SECRET) } });
check(1, 'the first code confirms the enrolment', confirmed.status === 200, `status ${confirmed.status}`);
const dash = await call('GET', 'platform/dashboard', { cookie });
check(1, 'with the second factor, the console reads', dash.status === 200, `status ${dash.status}`);

const ADMIN_DECISION = async () => {
  const s = await call('POST', 'platform/admin/step-up', { cookie, admin: true, body: { password: ADMIN_PW, code: await freshCode(SECRET) } });
  if (s.status !== 200) throw new Error(`step-up refused: ${s.status}`);
};
const noStepUp = await call('POST', 'platform/businesses', {
  cookie, admin: true,
  body: { idempotencyKey: randomUUID(), ownerName: 'X', businessName: 'X', phone: '+22240000001', language: 'fr', isTest: true, reason: 'x', confirmPassword: ADMIN_PW },
});
check(1, 'a decision without a fresh step-up (password + new code) is refused', noStepUp.status === 403 && noStepUp.json?.code === 'step_up_required', `status ${noStepUp.status} ${noStepUp.json?.code ?? ''}`);

// ── J2: a fictional Owner and test business ─────────────────────────────────────────────────────────────────────────
await ADMIN_DECISION();
const key = randomUUID();
const createBody = {
  idempotencyKey: key, ownerName: 'Mariem Test', businessName: 'Labo Test Nouakchott', branchName: 'Boutique Centre', activity: 'electronics',
  city: 'Nouakchott', phone: '+22241000001', language: 'fr', isTest: true, reason: 'Private browser test (D217)', confirmPassword: ADMIN_PW,
};
const created = await call('POST', 'platform/businesses', { cookie, admin: true, body: createBody });
const LAB = created.json?.companyId;
const SETUP_CODE = created.json?.invitation?.token;
check(2, 'the test business and its Owner are created, with a one-time setup code', created.status === 201 && created.json?.created === true && !!SETUP_CODE, `status ${created.status}`);
check(2, 'the answer separates provisioning from activation', created.json?.setup?.provisioning === 'awaiting_owner_setup' && created.json?.setup?.activation?.status === 'pending_activation' && created.json?.setup?.isTest === true);
check(2, 'the Owner’s number stays unverified, with no consent recorded', created.json?.setup?.owner?.phone?.verified === false && ['none', null].includes(created.json?.setup?.owner?.phone?.whatsappConsent ?? null));

// ── J4 (part): the same request again makes no second business and no second code ───────────────────────────────────
const retry = await call('POST', 'platform/businesses', { cookie, admin: true, body: createBody });
check(4, 'retrying the creation finds the same business, without a new setup code', retry.status === 201 && retry.json?.created === false && retry.json?.companyId === LAB && retry.json?.invitation === null, `status ${retry.status}`);

// ── J5: an access grant for the test account ────────────────────────────────────────────────────────────────────────
const grant = await call('POST', `platform/businesses/${LAB}/activate-grant`, { cookie, admin: true, body: { days: 30, reason: 'Test access (D217)', confirmPassword: ADMIN_PW } });
check(5, 'an explicit, audited grant gives the test business access', grant.status === 200 && grant.json?.status === 'activated', `status ${grant.status}`);
const pay = await call('POST', `platform/businesses/${LAB}/payments`, { cookie, admin: true, body: { amount: '500', paidAt: new Date().toISOString(), channel: 'manual', reference: 'FAKE-1', confirm: true, confirmPassword: ADMIN_PW } });
check(5, 'no payment can be recorded for a test business', pay.status === 403 && pay.json?.code === 'test_business_no_payment', `status ${pay.status} ${pay.json?.code ?? ''}`);

// ── J3: stores, opened under the grant ──────────────────────────────────────────────────────────────────────────────
const store1 = await call('POST', `platform/businesses/${LAB}/stores`, { cookie, admin: true, body: { name: 'Boutique Ksar', activity: 'electronics', reason: 'Second test store', confirmPassword: ADMIN_PW } });
const store2 = await call('POST', `platform/businesses/${LAB}/stores`, { cookie, admin: true, body: { name: 'Agence Tevragh', activity: 'money_agent', reason: 'Agent test store', confirmPassword: ADMIN_PW } });
check(3, 'two stores open at once, granted at no charge', [store1, store2].every((s) => s.status === 200 && s.json?.mode === 'granted' && s.json?.created === true && s.json?.allocation?.monthlyAmount === 0), `status ${store1.status}/${store2.status}`);
// J4: the same store again
const storeAgain = await call('POST', `platform/businesses/${LAB}/stores`, { cookie, admin: true, body: { name: 'Boutique Ksar', activity: 'electronics', reason: 'Second test store', confirmPassword: ADMIN_PW } });
check(4, 'the same store again opens nothing new', storeAgain.status === 200 && storeAgain.json?.created === false && storeAgain.json?.allocation?.id === store1.json?.allocation?.id, `status ${storeAgain.status}`);
const detail = await call('GET', `platform/businesses/${LAB}`, { cookie });
check(3, 'the business has three stores, once each', detail.json?.branches?.length === 3 && new Set(detail.json.branches.map((b) => b.name)).size === 3, `${detail.json?.branches?.map((b) => b.name).join(', ')}`);

// ── J11: the gate — customers stay closed, the test mechanism stays with test businesses ────────────────────────────
await ADMIN_DECISION();
const real = await call('POST', 'platform/businesses', {
  cookie, admin: true,
  body: { idempotencyKey: randomUUID(), ownerName: 'Real Owner', businessName: 'Real Shop', phone: '+22241000002', language: 'fr', isTest: false, reason: 'must be refused', confirmPassword: ADMIN_PW },
});
check(11, 'a customer business cannot be created while customer activation is closed', real.status === 403 && real.json?.code === 'customer_activation_closed', `status ${real.status} ${real.json?.code ?? ''}`);

// ── J5: the Owner sets their own password with the setup code, then signs in ────────────────────────────────────────
const OWNER_PW = randomUUID();
const wrong = await call('POST', 'auth/owner-setup', { body: { token: 'x'.repeat(43), password: OWNER_PW } });
check(5, 'an unknown setup code reads the one refusal', wrong.status === 400, `status ${wrong.status}`);
const setup = await call('POST', 'auth/owner-setup', { body: { token: SETUP_CODE, password: OWNER_PW } });
check(5, 'the setup code sets the Owner’s password, and opens no session', setup.status === 200 && setup.json?.next === 'sign_in' && !setup.json?.accessToken, `status ${setup.status}`);
const again = await call('POST', 'auth/owner-setup', { body: { token: SETUP_CODE, password: randomUUID() } });
check(5, 'the setup code works once', again.status === 400, `status ${again.status}`);
const login = await call('POST', 'auth/login', { body: { identifier: '+22241000001', password: OWNER_PW } });
const OWNER = login.json?.accessToken;
check(5, 'the Owner signs in with their number and their own password', login.status === 200 && !!OWNER, `status ${login.status}`);
const me = await call('GET', 'auth/me', { token: OWNER });
check(5, 'the app is told it is a test business', me.json?.isTestBusiness === true && me.json?.companyName === 'Labo Test Nouakchott');

// ── J6: the Owner sees only their business and its stores ───────────────────────────────────────────────────────────
const branches = await call('GET', 'auth/branches', { token: OWNER });
const names = (branches.json ?? []).map((b) => b.name).sort();
check(6, 'the Owner sees exactly their three stores', JSON.stringify(names) === JSON.stringify(['Agence Tevragh', 'Boutique Centre', 'Boutique Ksar']), names.join(', '));
const ent = await call('GET', 'entitlement', { token: OWNER, branch: branches.json?.[0]?.id });

// A second test business, to prove the walls between them.
await ADMIN_DECISION();
const other = await call('POST', 'platform/businesses', {
  cookie, admin: true,
  body: { idempotencyKey: randomUUID(), ownerName: 'Sidi Test', businessName: 'Labo Test Atar', phone: '+22241000003', language: 'ar', isTest: true, reason: 'Second test business', confirmPassword: ADMIN_PW },
});
const OTHER = other.json?.companyId;
await call('POST', `platform/businesses/${OTHER}/activate-grant`, { cookie, admin: true, body: { days: 30, reason: 'Test access', confirmPassword: ADMIN_PW } });
const otherPw = randomUUID();
await call('POST', 'auth/owner-setup', { body: { token: other.json?.invitation?.token, password: otherPw } });
const otherLogin = await call('POST', 'auth/login', { body: { identifier: '+22241000003', password: otherPw } });
const OTHER_OWNER = otherLogin.json?.accessToken;
const otherBranches = await call('GET', 'auth/branches', { token: OTHER_OWNER });
check(6, 'the second Owner sees only their own store', (otherBranches.json ?? []).length === 1 && otherBranches.json[0].name !== 'Boutique Centre');

// ── J7: inventory intake and a sale in the test business ────────────────────────────────────────────────────────────
const B = branches.json.find((b) => b.name === 'Boutique Centre')?.id;
const cats = await call('GET', 'categories', { token: OWNER, branch: B });
const catList = Array.isArray(cats.json) ? cats.json : (cats.json?.rows ?? []);
const accessory = catList.find((c) => /access/i.test(c.name)) ?? catList[0];
const product = await call('POST', 'products', { token: OWNER, branch: B, body: { brand: 'Anker', model: 'Chargeur 20W', trackingType: 'quantity', categoryId: accessory?.id, defaultCost: 150, defaultPrice: 250 } });
check(7, 'the Owner creates a product', [200, 201].includes(product.status) && !!product.json?.id, `status ${product.status} ${product.json?.message ?? ''}`);
const opened = await call('POST', 'closings/open', { token: OWNER, branch: B, body: { openingMoney: { clientUuid: randomUUID(), decision: 'set', cashAmount: 0 } } });
check(7, 'the Owner opens the shop’s business day', [200, 201].includes(opened.status), `status ${opened.status} ${JSON.stringify(opened.json?.code ?? opened.json?.message ?? '').slice(0, 160)}`);
const purchase = await call('POST', 'purchases', { token: OWNER, branch: B, body: { clientUuid: randomUUID(), paymentMethod: 'cash', items: [{ productId: product.json?.id, unitCost: 150, quantity: 5 }] } });
check(7, 'five chargers are received into stock', [200, 201].includes(purchase.status), `status ${purchase.status} ${JSON.stringify(purchase.json?.message ?? purchase.json?.rejected ?? '').slice(0, 160)}`);
const sale = await call('POST', 'sales', { token: OWNER, branch: B, body: { clientUuid: randomUUID(), lines: [{ productId: product.json?.id, quantity: 1, price: 250 }], payments: [{ method: 'cash', amount: 250 }] } });
check(7, 'one is sold for cash', [200, 201].includes(sale.status) && !sale.json?.acknowledgementToken, `status ${sale.status} ${JSON.stringify(sale.json?.code ?? sale.json?.message ?? '').slice(0, 160)}`);
const stock = await call('GET', 'inventory/summary', { token: OWNER, branch: B });
const row = (stock.json ?? []).find?.((r) => r.productId === product.json?.id);
check(7, 'four remain in stock', row && Number(row.quantity ?? row.onHand ?? row.available ?? row.total) === 4, JSON.stringify(row ?? stock.json?.message ?? '').slice(0, 200));

// ── J8: unauthorized callers are refused at the provisioning endpoints ──────────────────────────────────────────────
const anon = await call('POST', 'platform/businesses', { body: createBody });
check(8, 'no session: creating a business is refused', anon.status === 401, `status ${anon.status}`);
const ownerAtConsole = await call('POST', `platform/businesses/${LAB}/stores`, { token: OWNER, body: { name: 'X', reason: 'x' } });
check(8, 'an Owner’s app session is not an administrator’s', ownerAtConsole.status === 401, `status ${ownerAtConsole.status}`);
const ownerTestStatus = await call('POST', `platform/businesses/${LAB}/test-status`, { token: OWNER, body: { isTest: false, reason: 'x' } });
check(8, 'nor can an Owner change the test status', ownerTestStatus.status === 401, `status ${ownerTestStatus.status}`);
const ownerInvite = await call('POST', `platform/businesses/${LAB}/owner-invitation`, { token: OWNER, body: { reason: 'x' } });
check(8, 'nor issue a setup code', ownerInvite.status === 401, `status ${ownerInvite.status}`);

// ── J9: cross-company access is refused ─────────────────────────────────────────────────────────────────────────────
const crossBranch = await call('GET', 'inventory/summary', { token: OWNER, branch: otherBranches.json?.[0]?.id });
check(9, 'an Owner cannot read another business’s store', [403, 404].includes(crossBranch.status), `status ${crossBranch.status}`);
const crossSale = await call('GET', `sales/${sale.json?.id ?? sale.json?.sale?.id}`, { token: OTHER_OWNER, branch: otherBranches.json?.[0]?.id });
check(9, 'another business cannot open this sale', [403, 404].includes(crossSale.status), `status ${crossSale.status}`);

// Test and real stay apart: a real business cannot be created now, so the check is between test businesses and none.
const markStore = await call('PATCH', 'settings/discovery', { token: OWNER, branch: B, body: { isDiscoverable: true } });
void markStore;

// ── J10: unverified numbers and absent consent, as they are ─────────────────────────────────────────────────────────
const after = await call('GET', `platform/businesses/${LAB}`, { cookie });
check(10, 'after setup: provisioning ready, phone still unverified, consent still none', after.json?.setup?.provisioning === 'ready' && after.json?.setup?.owner?.phone?.verified === false && ['none', null].includes(after.json?.setup?.owner?.phone?.whatsappConsent ?? null) && after.json?.setup?.invitation?.state === 'accepted');
check(10, 'the people list says the Owner’s number is unverified', after.json?.people?.[0]?.phoneVerified === false);

// ── J11 continued: the test mechanism is test-only ──────────────────────────────────────────────────────────────────
const dashboard = await call('GET', 'platform/dashboard', { cookie });
check(11, 'test businesses are left out of the customer figures', dashboard.json?.businesses === 0 && dashboard.json?.testBusinesses === 2, `businesses ${dashboard.json?.businesses}, test ${dashboard.json?.testBusinesses}`);
const audit = await call('GET', 'platform/audit?page=1', { cookie });
const actions = new Set((audit.json?.rows ?? audit.json ?? []).map?.((r) => r.action) ?? []);
check(11, 'the audit records actor, target and outcome — refusals included', ['business.create', 'business.store_grant', 'business.create.refused', 'subscription.payment.refused', 'owner_invitation.accept'].every((a) => actions.has(a)), [...actions].sort().join(', ').slice(0, 300));

// ── J12: existing behaviour intact ──────────────────────────────────────────────────────────────────────────────────
const trial = await call('GET', 'account/trial-setup', { token: OWNER, branch: B });
check(12, 'a console-made business is not offered the free trial', [200, 404].includes(trial.status) && trial.json?.eligible !== true, `status ${trial.status}`);
const staff = await call('POST', 'users', { token: OWNER, branch: B, body: { name: 'Employe Test', phone: '+22241000004', role: 'store_employee', branchIds: [B] } });
check(12, 'the Owner can still create an employee (an invitation, nothing sent)', [200, 201].includes(staff.status), `status ${staff.status} ${JSON.stringify(staff.json?.code ?? staff.json?.message ?? '').slice(0, 160)}`);
const register = await call('POST', 'auth/register', { body: { idempotencyKey: randomUUID(), ownerName: 'A', businessName: 'B', branchName: 'C', phone: '+22241000005', password: 'password-1', language: 'fr', whatsappConsentVersion: 'wa-operational-2026-10-19' } });
check(12, 'self-service registration stays closed without a delivery channel', register.status === 503 && register.json?.code === 'registration_unavailable', `status ${register.status} ${register.json?.code ?? ''}`);

writeFileSync(`${DIR}journeys.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
