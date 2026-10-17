// The deployed public website against the build it should be (docs/95, docs/96): run from a machine that can reach the
// real domain, after `npm run build:public-release` with the production variables. Dependency-free (Node 22).
//
//   node scripts/verify-production.mjs https://tsxmr.com dist evidence/live.json
//
// Checks, each recorded as { name, ok, detail }: TLS for the apex and www; HTTP → HTTPS and www → apex (path and query
// kept, no loop); the security headers against `dist/_headers`; every built page and file served byte-for-byte as built
// (so the audits of that build apply to what is deployed); canonical URLs on the production origin; no preview host,
// tracker, Cloudflare beacon or plain-HTTP resource in any page; the protected addresses answer 404; the sitemap; and
// the email DNS records (Cloudflare Email Routing, one SPF, DMARC, Cloudflare and Brevo DKIM, Brevo's code) as they are
// recorded in the handoff. Exits 1 if any check fails.
import { createHash } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { connect } from 'node:tls';

const [origin = 'https://tsxmr.com', distDir = 'dist', out = 'live.json'] = process.argv.slice(2);
const host = new URL(origin).host;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
};
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
// A network failure is a failed check (status 0), never a crash that hides the other results.
const get = async (url, init = {}) => {
  try {
    return await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'tsxmr-verify-production' }, ...init });
  } catch (e) {
    return { status: 0, error: String(e.cause ?? e), headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), text: async () => '' };
  }
};

// ── TLS ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function tlsFacts(name) {
  return new Promise((resolve) => {
    const socket = connect({ host: name, port: 443, servername: name, timeout: 15000 }, () => {
      const cert = socket.getPeerCertificate();
      resolve({ authorized: socket.authorized, error: socket.authorizationError ?? null, validTo: cert.valid_to, altNames: cert.subjectaltname, issuer: cert.issuer?.O });
      socket.end();
    });
    socket.on('error', (e) => resolve({ authorized: false, error: String(e) }));
    socket.on('timeout', () => resolve({ authorized: false, error: 'timeout' }));
  });
}
for (const name of [host, `www.${host}`]) {
  const t = await tlsFacts(name);
  const daysLeft = t.validTo ? Math.round((Date.parse(t.validTo) - Date.now()) / 86400000) : -1;
  check(`TLS ${name}: valid certificate for the name`, t.authorized && String(t.altNames).includes(name) && daysLeft > 7, { ...t, daysLeft });
}

// ── Transport: HTTP → HTTPS, www → apex with path and query, no loop ─────────────────────────────────────────────────
async function follow(url, hops = 6) {
  const chain = [];
  let current = url;
  for (let i = 0; i < hops; i++) {
    const r = await get(current);
    chain.push(`${r.status} ${current}`);
    const location = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && location) current = new URL(location, current).href;
    else return { final: current, status: r.status, chain };
  }
  return { final: current, status: 0, chain, loop: true };
}
{
  const r = await get(`http://${host}/`);
  check('http://apex redirects to https://apex', [301, 308].includes(r.status) && r.headers.get('location') === `https://${host}/`, { status: r.status, location: r.headers.get('location') });
}
{
  const r = await get(`https://www.${host}/privacy?check=1`);
  check('https://www → apex, 301, path and query kept', r.status === 301 && r.headers.get('location') === `https://${host}/privacy?check=1`, { status: r.status, location: r.headers.get('location') });
}
for (const start of [`http://${host}/`, `http://www.${host}/terms?x=2`, `https://www.${host}/`, `https://${host}/fr/contact`]) {
  const f = await follow(start);
  const expected = start.replace('http://', 'https://').replace(`//www.${host}`, `//${host}`);
  check(`${start} ends at ${expected} with 200, no loop`, f.status === 200 && f.final === expected && !f.loop, f.chain);
}

// ── Security headers, as `_headers` sets them ───────────────────────────────────────────────────────────────────────
const headersFile = readFileSync(join(distDir, '_headers'), 'utf8');
const globalBlock = headersFile.split(/\n(?=\S)/).find((b) => b.startsWith('/*'));
const expectedHeaders = Object.fromEntries(
  globalBlock
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]),
);
{
  const r = await get(`${origin}/`);
  const actual = Object.fromEntries(Object.keys(expectedHeaders).map((k) => [k, r.headers.get(k)]));
  const wrong = Object.keys(expectedHeaders).filter((k) => actual[k] !== expectedHeaders[k]);
  check('security headers on / equal dist/_headers', wrong.length === 0, wrong.length ? { wrong, actual } : Object.keys(expectedHeaders));
  check('HSTS without preload', /max-age=\d+/.test(actual['strict-transport-security'] ?? '') && !/preload/.test(actual['strict-transport-security'] ?? ''), actual['strict-transport-security']);
}

// ── Every built file, served as built ───────────────────────────────────────────────────────────────────────────────
function walk(dir) {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}
const files = walk(distDir)
  .map((f) => relative(distDir, f).split('\\').join('/'))
  .filter((f) => !['_headers', '_redirects', '404.html'].includes(f));
const urlOf = (f) => (f.endsWith('.html') ? `/${f.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}` : `/${f}`);
const TRACKERS = /cloudflareinsights|googletagmanager|google-analytics|gtag\(|fbq\(|connect\.facebook|plausible|clarity\.ms|hotjar|segment\.com|matomo/i;
// Cloudflare's zone-level Email Address Obfuscation rewrites every mailto: link at the edge and adds its own script.
const OBFUSCATION = /\/cdn-cgi\/l\/email-protection|__cf_email__|email-decode\.min\.js/;
// Where the served bytes first differ from the built ones, for the record.
function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { at: i, built: b.toString('utf8', Math.max(0, i - 60), i + 160), live: a.toString('utf8', Math.max(0, i - 60), i + 260) };
}
const obfuscated = [];
const mismatched = [];
const pageProblems = [];
let pages = 0;
for (const f of files) {
  const path = urlOf(f);
  const r = await get(`${origin}${path}`);
  const body = Buffer.from(await r.arrayBuffer());
  const local = readFileSync(join(distDir, f));
  if (r.status !== 200) {
    mismatched.push({ path, status: r.status });
    continue;
  }
  if (f === '.well-known/security.txt') {
    // Its Expires line is stamped at build time; every other line must match.
    const strip = (b) => b.toString('utf8').replace(/^Expires:.*$/m, '');
    if (strip(body) !== strip(local)) mismatched.push({ path, reason: 'content' });
  } else if (sha(body) !== sha(local)) {
    mismatched.push({ path, live: sha(body).slice(0, 12), built: sha(local).slice(0, 12), bytes: [body.length, local.length], ...(mismatched.length < 2 ? { first: firstDifference(body, local) } : {}) });
  }
  if (f.endsWith('.html')) {
    pages++;
    const html = body.toString('utf8');
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const inApp = /(^|\/)in-app\//.test(f);
    const problems = [];
    if (!inApp && canonical !== `${origin}${path === '/' ? '/' : path}`) problems.push(`canonical ${canonical}`);
    if (/pages\.dev/.test(html)) problems.push('a preview host');
    if (TRACKERS.test(html)) problems.push(`tracker ${html.match(TRACKERS)[0]}`);
    if (OBFUSCATION.test(html)) obfuscated.push(path);
    if (/\/cdn-cgi\//.test(html) && !OBFUSCATION.test(html)) problems.push('another /cdn-cgi/ injection');
    if (/(src|href)="http:\/\//.test(html)) problems.push('plain-HTTP resource');
    if (inApp && !/noindex/.test(r.headers.get('x-robots-tag') ?? '')) problems.push('in-app page without noindex');
    if (problems.length) pageProblems.push({ path, problems });
  }
}
check(`every built file is served byte-for-byte as built (${files.length} files)`, mismatched.length === 0, mismatched.slice(0, 20));
check(`${pages} pages: canonical on ${origin}, no preview host, tracker, beacon or plain-HTTP resource; in-app noindex`, pageProblems.length === 0, pageProblems.slice(0, 20));
check('no edge rewriting of the pages (Cloudflare Email Address Obfuscation off)', obfuscated.length === 0, obfuscated.length ? `${obfuscated.length} pages rewritten: ${obfuscated.slice(0, 6).join(' ')}…` : '');
{
  // The rewritten files, apart from the rewrite: equal to the build once Cloudflare's markup is decoded back.
  const decode = (html) =>
    html
      .replace(/<script data-cfasync="false" src="\/cdn-cgi\/scripts\/[^"]+\/email-decode\.min\.js"><\/script>/g, '')
      .replace(/<a([^>]*?) href="\/cdn-cgi\/l\/email-protection#([0-9a-f]+)"/g, (_, attrs, hex) => `<a${attrs} href="mailto:${cfDecode(hex)}"`)
      .replace(/<span class="__cf_email__" data-cfemail="([0-9a-f]+)">\[email(?:&#160;|\u00a0| )protected\]<\/span>/g, (_, hex) => cfDecode(hex));
  const cfDecode = (hex) => {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  };
  const residue = [];
  for (const m of mismatched.filter((x) => x.path && obfuscated.includes(x.path))) {
    const f = files.find((x) => urlOf(x) === m.path);
    const live = Buffer.from(await (await get(`${origin}${m.path}`)).arrayBuffer()).toString('utf8');
    if (decode(live) !== readFileSync(join(distDir, f), 'utf8')) residue.push(m.path);
  }
  const unexplained = mismatched.filter((x) => !obfuscated.includes(x.path));
  check('every difference from the build is that rewrite and nothing else', residue.length === 0 && unexplained.length === 0, { residue, unexplained: unexplained.slice(0, 10) });
}

// ── The protected and unknown addresses ─────────────────────────────────────────────────────────────────────────────
{
  const paths = ['/account', '/account/trial', '/admin', '/admin/businesses', '/apply', '/login', '/application-status', '/fr/apply', '/app-shell.html', '/no-such-page'];
  const statuses = {};
  for (const p of paths) statuses[p] = (await get(`${origin}${p}`)).status;
  check('protected and unknown addresses answer 404', Object.values(statuses).every((s) => s === 404), statuses);
}
{
  const sitemap = await (await get(`${origin}/sitemap.xml`)).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check('sitemap: every URL on the production origin, no in-app or protected page', locs.length > 0 && locs.every((l) => l.startsWith(`${origin}/`) && !/\/in-app(\/|$)|\/(account|admin)(\/|$)/.test(l)), `${locs.length} URLs`);
}

// ── Email DNS, as recorded in the handoff (only the website's own records may have changed) ─────────────────────────
const dns = new Resolver();
dns.setServers(['1.1.1.1', '8.8.8.8']);
const safe = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    return { error: e.code ?? String(e) };
  }
};
const apex = host.replace(/^www\./, '');
const mx = await safe(() => dns.resolveMx(apex));
const rootTxt = await safe(() => dns.resolveTxt(apex));
const dmarc = await safe(() => dns.resolveTxt(`_dmarc.${apex}`));
const cfDkim = await safe(() => dns.resolveTxt(`cf2024-1._domainkey.${apex}`));
const brevo1 = await safe(() => dns.resolveCname(`brevo1._domainkey.${apex}`));
const brevo2 = await safe(() => dns.resolveCname(`brevo2._domainkey.${apex}`));
const txt = Array.isArray(rootTxt) ? rootTxt.map((r) => r.join('')) : [];
const spf = txt.filter((t) => t.startsWith('v=spf1'));
const mxHosts = Array.isArray(mx) ? mx.map((m) => m.exchange).sort() : [];
check('MX: the three Cloudflare Email Routing hosts only', JSON.stringify(mxHosts) === JSON.stringify(['route1.mx.cloudflare.net', 'route2.mx.cloudflare.net', 'route3.mx.cloudflare.net']), mx);
check('SPF: exactly one record at the root, with Cloudflare Email Routing', spf.length === 1 && spf[0].includes('include:_spf.mx.cloudflare.net'), spf);
check("Brevo's code TXT at the root", txt.some((t) => t.startsWith('brevo-code:')), txt.map((t) => (t.startsWith('brevo-code:') ? 'brevo-code:…' : t)));
const dmarcTxt = Array.isArray(dmarc) ? dmarc.map((r) => r.join('')) : [];
check('DMARC record present', dmarcTxt.length === 1 && dmarcTxt[0].startsWith('v=DMARC1'), dmarcTxt);
const cfDkimTxt = Array.isArray(cfDkim) ? cfDkim.map((r) => r.join('')) : [];
check('Cloudflare DKIM (cf2024-1) present', cfDkimTxt.some((t) => t.startsWith('v=DKIM1')), cfDkimTxt.map((t) => `${t.slice(0, 24)}…`));
check('Brevo DKIM CNAMEs (brevo1, brevo2) present', Array.isArray(brevo1) && Array.isArray(brevo2), { brevo1, brevo2 });

// ── The preview host (informational: how a review copy presents itself to search engines) ───────────────────────────
const previews = {};
for (const p of ['https://site-redesign.tsxmr-public.pages.dev/', 'https://tsxmr-public.pages.dev/']) {
  const r = await safe(() => get(p));
  if (r.error) {
    previews[p] = r;
    continue;
  }
  const html = r.status === 200 ? await r.text() : '';
  previews[p] = { status: r.status, location: r.headers.get('location'), robots: r.headers.get('x-robots-tag'), canonical: html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null };
}
results.push({ name: 'preview hosts (information only)', ok: true, detail: previews });
console.log('INFO  preview hosts', JSON.stringify(previews));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ origin, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
