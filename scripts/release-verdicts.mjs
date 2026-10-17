// The three release verdicts (docs/96) — PUBLIC_WEBSITE, PORTAL, APP_STORE — for the environment this runs in
// (Cloudflare's variables, or none in CI). Reads the rules and the texts from the prerenderer's bundle (`dist-ssr/`, any
// build mode) and, for PUBLIC_WEBSITE, checks a built public site too:
//
//   node scripts/release-verdicts.mjs [--dist dist] [--links audit-links.txt] [--browser playwright-results.json] [--require public]
//
// --dist     a public build: its security headers, no portal or API code, no rewrite into a protected area
// --links    the broken-link audit's output for that build (must report 0 broken)
// --browser  Playwright's JSON report of `E2E_SURFACE=public` (accessibility, phone/desktop, no foreign request)
// --require public  exit 1 unless PUBLIC_WEBSITE is GO (the gate a deployment of tsxmr.com runs). PORTAL and APP_STORE
//                   are reported, never opened from here: they need proof only the backend, the app and Apple can give.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const root = resolve(import.meta.dirname, '..');
const ssr = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href);
const verdicts = ssr.releaseVerdicts(process.env);
const pub = verdicts.find((v) => v.gate === 'PUBLIC_WEBSITE');

// The built public site.
const dist = arg('--dist');
const built = [];
if (dist) {
  const d = resolve(dist);
  const walk = (x) => readdirSync(x).flatMap((n) => (statSync(join(x, n)).isDirectory() ? walk(join(x, n)) : [join(x, n)]));
  const headers = existsSync(join(d, '_headers')) ? readFileSync(join(d, '_headers'), 'utf8').split('\n\n')[0] : '';
  for (const [what, re] of [
    ['a Content Security Policy that reaches no other origin', /Content-Security-Policy: [^\n]*connect-src 'self';/],
    ['HSTS', /Strict-Transport-Security: max-age=31536000/],
    ['framing refused', /X-Frame-Options: DENY/],
    ['no MIME sniffing', /X-Content-Type-Options: nosniff/],
    ['a referrer policy', /Referrer-Policy: strict-origin-when-cross-origin/],
    ['a permissions policy', /Permissions-Policy: camera=\(\)/],
  ])
    if (!re.test(headers)) built.push(`the site's headers lack ${what}`);
  if (existsSync(join(d, 'app-shell.html'))) built.push('the build carries the protected areas’ shell');
  if (existsSync(join(d, '_redirects')) && readFileSync(join(d, '_redirects'), 'utf8').trim()) built.push('the build rewrites addresses into a protected area');
  const PROTECTED_ONLY = [/platform\/admin\/(sign-in|mfa|step-up)/, /platform\/(dashboard|businesses|pending|audit)/, /platform\/my-subscription/, /account\/trial/];
  for (const f of walk(d).filter((f) => /\.(html|js)$/.test(f)))
    for (const re of PROTECTED_ONLY) if (re.test(readFileSync(f, 'utf8'))) built.push(`portal or console code in ${relative(d, f)} (${re.source})`);
  if (!existsSync(join(d, 'robots.txt'))) built.push('no robots.txt');
  if (!existsSync(join(d, 'sitemap.xml'))) built.push('no sitemap.xml');
}
const links = arg('--links');
if (links) {
  const m = readFileSync(links, 'utf8').match(/broken (\d+)/);
  if (!m || m[1] !== '0') built.push(`the broken-link audit did not pass (${m ? `${m[1]} broken` : 'no result'})`);
}
const browser = arg('--browser');
if (browser) {
  const r = JSON.parse(readFileSync(browser, 'utf8'));
  const s = r.stats ?? {};
  if (!s.expected || s.unexpected || s.flaky) built.push(`the public browser checks did not all pass (passed ${s.expected ?? 0}, failed ${s.unexpected ?? '?'}, flaky ${s.flaky ?? 0})`);
}
for (const detail of built) pub.problems.push({ problem: 'external', detail });
if (!dist || !links || !browser) pub.problems.push({ problem: 'external', detail: 'not checked here: the built public site (pass --dist, --links and --browser)' });
pub.go = pub.problems.length === 0;

for (const v of verdicts) {
  console.log(`\n${v.gate}: ${v.go ? 'GO' : 'NO-GO'}${v.go ? '' : ` — ${v.problems.length} reason(s)`}`);
  for (const p of v.problems) console.log(`  - ${p.env ? `${p.env} ` : ''}[${p.problem}] ${p.detail}`);
}
console.log('');
if (process.argv.includes('--require') && arg('--require') === 'public' && !pub.go) process.exit(1);
