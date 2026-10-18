// A deployed Cloudflare Pages preview against the build it should be, and production left as it was (docs/95, D201).
// Run from a machine that can reach both, after `npm run build:public-release` of the commit with the production
// variables. Dependency-free (Node 22).
//
//   node verify/preview-check.mjs https://website-balanced-motion.tsxmr-public.pages.dev site/dist preview.json https://tsxmr.com
//
// Checks, each recorded as { name, ok, detail }:
//  - every built page and file is served by the preview byte-for-byte as built: the preview is that commit;
//  - every page carries `X-Robots-Tag: noindex`, and its canonical names the production origin, never the preview;
//  - the security headers equal `_headers`;
//  - production keeps its indexing (no `X-Robots-Tag`; `robots.txt` as built) and is not this build (not promoted).
// Exits 1 if any check fails.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const [origin, distDir = 'dist', out = 'preview.json', production = 'https://tsxmr.com'] = process.argv.slice(2);
if (!origin?.startsWith('https://') && !origin?.startsWith('http://127.0.0.1')) throw new Error('usage: preview-check.mjs <https://preview-origin> <dist> <out.json> [production-origin]');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
};
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const get = async (url) => {
  try {
    return await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'tsxmr-verify-preview' } });
  } catch (e) {
    return { status: 0, error: String(e.cause ?? e), headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0), text: async () => '' };
  }
};
function walk(dir) {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

// ── Every built file, served as built ───────────────────────────────────────────────────────────────────────────────
const files = walk(distDir)
  .map((f) => relative(distDir, f).split('\\').join('/'))
  .filter((f) => !['_headers', '_redirects'].includes(f) && !/(^|\/)404\.html$/.test(f));
const urlOf = (f) => (f.endsWith('.html') ? `/${f.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}` : `/${f}`);
const mismatched = [];
const notNoindex = [];
const badCanonical = [];
let pages = 0;
for (const f of files) {
  const url = `${origin}${urlOf(f)}`;
  const r = await get(url);
  const live = Buffer.from(await r.arrayBuffer());
  const built = readFileSync(join(distDir, f));
  if (r.status !== 200 || sha(live) !== sha(built)) mismatched.push({ file: f, status: r.status, live: live.length, built: built.length });
  if (f.endsWith('.html')) {
    pages++;
    if (!/noindex/i.test(r.headers.get('x-robots-tag') ?? '')) notNoindex.push({ url: urlOf(f), xRobotsTag: r.headers.get('x-robots-tag') });
    const canonical = built.toString('utf8').match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical && (!canonical.startsWith(`${production}/`) && canonical !== production)) badCanonical.push({ url: urlOf(f), canonical });
  }
}
check(`every built file (${files.length}) is served byte-for-byte as built`, mismatched.length === 0, mismatched.slice(0, 20));
check(`every page (${pages}) carries X-Robots-Tag: noindex`, notNoindex.length === 0, notNoindex.slice(0, 20));
check(`every canonical names ${production}, never the preview`, badCanonical.length === 0, badCanonical.slice(0, 20));
{
  const r = await get(`${origin}/robots.txt`);
  check('robots.txt is reachable (so crawlers can read the noindex header on every page)', r.status === 200, { status: r.status, xRobotsTag: r.headers.get('x-robots-tag') });
}

// ── Security headers, as `_headers` sets them ───────────────────────────────────────────────────────────────────────
const headersFile = readFileSync(join(distDir, '_headers'), 'utf8');
const globalBlock = headersFile.split(/\n(?=\S)/).find((b) => b.startsWith('/*'));
const expected = Object.fromEntries(
  globalBlock
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]),
);
{
  const r = await get(`${origin}/`);
  const wrong = Object.keys(expected).filter((k) => r.headers.get(k) !== expected[k]);
  check('security headers on the preview equal dist/_headers', wrong.length === 0, wrong.length ? Object.fromEntries(wrong.map((k) => [k, r.headers.get(k)])) : Object.keys(expected));
}

// ── Production: indexing unchanged, not promoted ────────────────────────────────────────────────────────────────────
{
  const home = await get(`${production}/`);
  const body = await home.text();
  check(`${production}/ answers 200 with no X-Robots-Tag (indexing unchanged)`, home.status === 200 && !home.headers.get('x-robots-tag'), { status: home.status, xRobotsTag: home.headers.get('x-robots-tag') });
  check(`${production}/ is not this build (not promoted: no illustration)`, home.status === 200 && !body.includes('class="showcase"'), { showcase: body.includes('class="showcase"') });
  const robots = await get(`${production}/robots.txt`);
  const builtRobots = readFileSync(join(distDir, 'robots.txt'), 'utf8');
  const liveRobots = await robots.text();
  check(`${production}/robots.txt is the production robots.txt (unchanged)`, robots.status === 200 && liveRobots === builtRobots && !/^Disallow:\s*\/\s*$/m.test(liveRobots), { status: robots.status, same: liveRobots === builtRobots });
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ origin, production, checkedAt: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
