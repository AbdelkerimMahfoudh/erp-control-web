#!/usr/bin/env node
/**
 * Package a portal build for https://dukan.tsxmr.com on the production edge (backend deploy/production/portal-site.sh).
 *
 *   node scripts/caddy-portal-release.mjs <dist> <release-dir> <commit> [--audit]
 *
 * `--audit` packages CI's customer-audit build (production aliases, marked test values) to prove these checks on a real
 * portal build while the PORTAL gate keeps a production one closed. Its release says so, and portal-site.sh never
 * installs it.
 *
 * Writes `<release-dir>/site/`, `<release-dir>/routes.caddy` and `<release-dir>/portal-release.txt`. It refuses a build
 * whose Content Security Policy names any API but https://api.tsxmr.com, a build that is not the portal surface, a build
 * holding the console (an `/admin` route or the console's own API paths anywhere in its files), a build not noindex on
 * every page, a preview build, and a directory that already exists (post-Build-4, the owner's brief of 2026-11-03).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { caddyRoutes, parseHeaders, parseRedirects } from './caddy-rules.ts';

const API = 'https://api.tsxmr.com';
const [dist, releaseDir, commit, flag] = process.argv.slice(2);
const audit = flag === '--audit';
/** @param {string} message @returns {never} */
const fail = (message) => {
  console.error(`caddy-portal-release: ${message}`);
  process.exit(1);
};

if (!dist || !releaseDir || !/^[0-9a-f]{7,40}$/.test(commit ?? '')) fail('usage: node scripts/caddy-portal-release.mjs <dist> <release-dir> <commit>');
for (const file of ['app-shell.html', '404.html', '_headers', '_redirects']) {
  if (!existsSync(join(dist, file))) fail(`${dist} is not a portal build (no ${file})`);
}
if (existsSync(releaseDir)) fail(`${releaseDir} already exists`);

const headers = parseHeaders(readFileSync(join(dist, '_headers'), 'utf8'));
const redirects = parseRedirects(readFileSync(join(dist, '_redirects'), 'utf8'));
const everyPage = headers.find((r) => r.path === '/*');
const value = (/** @type {string} */ name) => everyPage?.set.find(([n]) => n === name)?.[1] ?? '';
if (!value('Content-Security-Policy').includes(`connect-src 'self' ${API};`)) fail(`the build's API is not ${API}`);
if (!/noindex/.test(value('X-Robots-Tag'))) fail('the build does not say noindex on every page');
if (!redirects.some((r) => r.from === '/subscription/*' && r.status === 200)) fail("the build has no Owner's page");
if (!redirects.some((r) => r.from === '/claim/*' && r.status === 200)) fail('the build has no claim page');
if (redirects.some((r) => r.from.startsWith('/admin') || r.to.startsWith('/admin'))) fail('the build serves the console');

// Absent, not hidden: no file of the build may carry the console's routes or its API calls.
const files = (/** @type {string} */ dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
for (const file of files(dist).filter((f) => /\.(js|html|css)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  if (/platform\/admin\/|platform\/businesses|platform\/dashboard/.test(text)) fail(`${file} holds console code`);
  if (!audit && /\.invalid\b|\[TEST\]/.test(text)) fail(`${file} is from a preview build`);
}

mkdirSync(releaseDir, { recursive: true });
cpSync(dist, join(releaseDir, 'site'), { recursive: true, filter: (src) => !/[\\/]_(headers|redirects)$/.test(src) });
writeFileSync(join(releaseDir, 'routes.caddy'), caddyRoutes(headers, redirects));
writeFileSync(join(releaseDir, 'portal-release.txt'), `commit ${commit}\napi ${API}\n`);
console.log(`caddy-portal-release: ${headers.length} header rules, ${redirects.length} redirect rules, commit ${commit} → ${releaseDir}`);
