#!/usr/bin/env node
/**
 * Package a portal build for the private test console on the production edge (D217; backend docs/100 §16).
 *
 *   node scripts/caddy-release.mjs <dist> <release-dir> <site-origin> <api-base>
 *
 * Writes `<release-dir>/site/` (the build, without its Pages rule files) and `<release-dir>/routes.caddy`
 * (scripts/caddy-rules.ts), the two things the edge's `test-console.caddy` serves. It refuses:
 * - a site origin that is not an exact https origin, or is a production name — the test console never takes
 *   dukan.tsxmr.com, whose production build the PORTAL gate still refuses (docs/96);
 * - an API base that is not an exact `https://<host>/api/v1`, or a build whose Content Security Policy does not name it;
 * - a build that is not the portal surface, or does not say noindex on every page;
 * - a release directory that already exists: a release is made whole, never on top of another.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { caddyRoutes, parseHeaders, parseRedirects } from './caddy-rules.ts';

const PRODUCTION_NAMES = ['https://tsxmr.com', 'https://www.tsxmr.com', 'https://dukan.tsxmr.com', 'https://api.tsxmr.com'];

const [dist, releaseDir, siteOrigin, apiBase] = process.argv.slice(2);
/** @param {string} message @returns {never} */
const fail = (message) => {
  console.error(`caddy-release: ${message}`);
  process.exit(1);
};
/** @param {string} value */
const urlOf = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

if (!dist || !releaseDir || !siteOrigin || !apiBase) fail('usage: node scripts/caddy-release.mjs <dist> <release-dir> <site-origin> <api-base>');
const site = urlOf(siteOrigin);
if (!site || site.protocol !== 'https:' || site.origin !== siteOrigin) fail(`"${siteOrigin}" is not an exact https:// origin`);
if (PRODUCTION_NAMES.includes(siteOrigin)) fail(`${siteOrigin} is a production name: the test console has its own`);
const api = urlOf(apiBase);
if (!api || api.protocol !== 'https:' || apiBase !== `${api.origin}/api/v1`) fail(`"${apiBase}" is not an exact https://<host>/api/v1`);
if (api.origin === siteOrigin) fail('the site and the API need two names');
for (const file of ['app-shell.html', '404.html', '_headers', '_redirects']) {
  if (!existsSync(join(dist, file))) fail(`${dist} is not a portal build (no ${file})`);
}
if (existsSync(releaseDir)) fail(`${releaseDir} already exists`);

const headers = parseHeaders(readFileSync(join(dist, '_headers'), 'utf8'));
const redirects = parseRedirects(readFileSync(join(dist, '_redirects'), 'utf8'));
const everyPage = headers.find((r) => r.path === '/*');
const csp = everyPage?.set.find(([name]) => name === 'Content-Security-Policy')?.[1] ?? '';
if (!csp.includes(`connect-src 'self' ${api.origin}`)) fail(`the build was not made for ${apiBase}: build it with VITE_API_BASE=${apiBase}`);
if (!/noindex/.test(everyPage?.set.find(([name]) => name === 'X-Robots-Tag')?.[1] ?? '')) fail('the build does not say noindex on every page');
if (!redirects.some((r) => r.from === '/admin/*' && r.status === 200) || !redirects.some((r) => r.from === '/subscription/*' && r.status === 200)) {
  fail('the build is not the portal surface (VITE_SITE_SURFACE=portal): no console and no subscription page');
}

mkdirSync(releaseDir, { recursive: true });
cpSync(dist, join(releaseDir, 'site'), { recursive: true, filter: (src) => !/[\\/]_(headers|redirects)$/.test(src) });
writeFileSync(join(releaseDir, 'routes.caddy'), caddyRoutes(headers, redirects));
console.log(`caddy-release: ${headers.length} header rules, ${redirects.length} redirect rules, API ${api.origin} → ${releaseDir} for ${siteOrigin}`);
