// Exported-bundle audit (docs/74 §9): what a visitor can download must hold no secret, no source map, no credential
// and no private address beyond the preview's own mock API; the prerendered public pages must hold no protected data.
// Prints every finding with its file; exits 1 on any. A preview build is expected to carry its marked test values —
// they are counted and reported, never accepted in production (the build refuses them first).
//
// A public build (`VITE_SITE_SURFACE=public`, docs/95) is audited with `--public`: no file of it may hold the console's
// or the business account's code or routes, nor the protected areas' shell — the areas are not on that origin at all —
// nor any API route or address, even in a preview: the pre-launch website calls no API (docs/96).
//
// A portal build (`VITE_SITE_SURFACE=portal`, docs/101) is audited with `--portal`: no page of the company site, no
// sitemap, nothing a crawler may index — robots refuses everything and every response says noindex.
//
// Every build: the portal is https://dukan.tsxmr.com, and the old setup link's landing (`/account/trial`, with a token
// in its address) is gone — neither "portal.tsxmr.com" nor that landing may appear in any file.
//
//   node scripts/audit-bundle.mjs [dist] [--preview] [--public | --portal]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const preview = process.argv.includes('--preview');
const publicSurface = process.argv.includes('--public');
const portalSurface = process.argv.includes('--portal');
// The only HTML files a portal build has: the shell, its root's copy of it, and its not-found page.
const PORTAL_HTML = new Set(['app-shell.html', 'index.html', '404.html']);
// What only the console or the business account contains: their API routes and the shell they load in.
const PROTECTED_ONLY = [
  ['console sign-in route', /platform\/admin\/(sign-in|mfa|step-up)/],
  ['console data route', /platform\/(dashboard|businesses|pending|audit)/],
  ['account data route', /platform\/my-subscription/],
  // The pre-launch website calls no API at all: no price, quote, application or sign-in request.
  ['API route', /platform\/(plan|quote|register|portal-sign-out|seat-requests)\b/],
];
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = walk(dist);

const SECRETS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['JSON web token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['Bearer credential', /Bearer\s+[A-Za-z0-9._-]{20,}/],
  ['Stripe-style live key', /\b(sk|rk)_live_[0-9a-zA-Z]{10,}/],
  ['Meta access token', /\bEAA[A-Za-z0-9]{30,}/],
  ['password assignment', /\b(password|passwd|secret|api[_-]?key)\s*[:=]\s*["'][^"']{6,}["']/i],
  ['database URL with credentials', /\bmysql:\/\/[^\s"'@/]+:[^\s"'@/]+@/],
];
const PRIVATE = /\b(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|127\.0\.0\.1|localhost)(:\d+)?\b/g;
// A full preview talks to its mock API on this machine; a public build has no API to talk to, preview or not.
const ALLOWED_PRIVATE = preview && !publicSurface ? new Set(['127.0.0.1:3999', '127.0.0.1:3010', '127.0.0.1']) : new Set();

const findings = [];
let bytes = 0;
let testValues = 0;
for (const f of files) {
  const rel = relative(dist, f);
  const size = statSync(f).size;
  bytes += size;
  if (rel.endsWith('.map')) findings.push({ file: rel, what: 'source map published' });
  if (!/\.(html|js|css|txt|xml|json|webmanifest|svg)$/.test(rel) && !rel.startsWith('_')) continue;
  const text = readFileSync(f, 'utf8');
  if (/sourceMappingURL=/.test(text)) findings.push({ file: rel, what: 'sourceMappingURL reference' });
  if (publicSurface) {
    if (rel === 'app-shell.html') findings.push({ file: rel, what: 'protected-area shell in a public build' });
    for (const [what, re] of PROTECTED_ONLY) if (re.test(text)) findings.push({ file: rel, what: `${what} in a public build` });
  }
  if (portalSurface) {
    if (rel.endsWith('.html') && !PORTAL_HTML.has(rel)) findings.push({ file: rel, what: 'a company-site page in a portal build' });
    if (rel === 'sitemap.xml') findings.push({ file: rel, what: 'a sitemap in a portal build' });
    if (rel === 'robots.txt' && text !== 'User-agent: *\nDisallow: /\n') findings.push({ file: rel, what: 'robots.txt lets a crawler in' });
    if (rel === '_headers' && !/^\/\*\n(?:  .*\n)*  X-Robots-Tag: noindex, nofollow/.test(text)) findings.push({ file: rel, what: 'the portal is not noindex on every address' });
  }
  if (/\bportal\.tsxmr\.com\b/.test(text)) findings.push({ file: rel, what: 'the portal named portal.tsxmr.com (it is dukan.tsxmr.com)' });
  if (/account\/trial/.test(text)) findings.push({ file: rel, what: 'the retired setup-link landing' });
  for (const [what, re] of SECRETS) if (re.test(text)) findings.push({ file: rel, what });
  for (const m of text.matchAll(PRIVATE)) {
    if (ALLOWED_PRIVATE.has(m[0])) continue;
    // React and the router name "localhost" in development-only messages; a real address has a port or a dotted IP.
    if (m[0] === 'localhost' && rel.endsWith('.js')) continue;
    findings.push({ file: rel, what: `private address ${m[0]}` });
  }
  testValues += (text.match(/\.invalid\b|\[TEST\]/g) ?? []).length;
  // The prerendered public pages carry no protected content: nothing of the console or the account's data.
  if (rel.endsWith('.html') && rel !== 'app-shell.html') {
    for (const [what, re] of [
      ['console data route', /platform\/(dashboard|businesses|pending|audit)/],
      ['account data route', /platform\/my-subscription/],
    ])
      if (re.test(text)) findings.push({ file: rel, what });
  }
}
if (portalSurface && !files.some((f) => relative(dist, f) === 'robots.txt')) findings.push({ file: 'robots.txt', what: 'missing from a portal build' });
console.log(`files ${files.length}, bytes ${bytes}, mode ${preview ? 'preview' : 'production'}, surface ${publicSurface ? 'public' : portalSurface ? 'portal' : 'full'}`);
console.log(`marked test values found: ${testValues}${preview ? ' (expected in a preview build)' : ''}`);
if (!preview && testValues > 0) findings.push({ file: '*', what: `${testValues} test values in a production build` });
for (const x of findings) console.log(`FINDING ${x.file}: ${x.what}`);
console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: no secret, source map, credential or stray private address');
process.exit(findings.length ? 1 : 0);
