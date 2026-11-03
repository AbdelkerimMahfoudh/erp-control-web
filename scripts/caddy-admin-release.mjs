#!/usr/bin/env node
/**
 * Package an admin build for https://admin.tsxmr.com on the production edge (backend deploy/production/admin-site.sh).
 *
 *   node scripts/caddy-admin-release.mjs <dist> <release-dir> <commit>
 *
 * Writes `<release-dir>/site/`, `<release-dir>/routes.caddy` and `<release-dir>/admin-release.txt`. It refuses a build
 * whose Content Security Policy names any API but https://api.tsxmr.com, a build that is not the admin surface or that
 * serves the customers' portal, a build not noindex on every page, a preview build, and a directory that already exists.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { caddyRoutes, parseHeaders, parseRedirects } from './caddy-rules.ts';

const API = 'https://api.tsxmr.com';
const [dist, releaseDir, commit] = process.argv.slice(2);
/** @param {string} message @returns {never} */
const fail = (message) => {
  console.error(`caddy-admin-release: ${message}`);
  process.exit(1);
};

if (!dist || !releaseDir || !/^[0-9a-f]{7,40}$/.test(commit ?? '')) fail('usage: node scripts/caddy-admin-release.mjs <dist> <release-dir> <commit>');
for (const file of ['app-shell.html', '404.html', '_headers', '_redirects']) {
  if (!existsSync(join(dist, file))) fail(`${dist} is not an admin build (no ${file})`);
}
if (existsSync(releaseDir)) fail(`${releaseDir} already exists`);

const headers = parseHeaders(readFileSync(join(dist, '_headers'), 'utf8'));
const redirects = parseRedirects(readFileSync(join(dist, '_redirects'), 'utf8'));
const everyPage = headers.find((r) => r.path === '/*');
const value = (/** @type {string} */ name) => everyPage?.set.find(([n]) => n === name)?.[1] ?? '';
if (!value('Content-Security-Policy').includes(`connect-src 'self' ${API};`)) fail(`the build's API is not ${API}`);
if (!/noindex/.test(value('X-Robots-Tag'))) fail('the build does not say noindex on every page');
if (!redirects.some((r) => r.from === '/admin/*' && r.status === 200)) fail('the build has no console');
if (redirects.some((r) => r.from.startsWith('/subscription') || r.from.startsWith('/join') || r.to.startsWith('/subscription'))) fail("the build serves the customers' portal");
if (/\.invalid\b|\[TEST\]/.test(readFileSync(join(dist, 'app-shell.html'), 'utf8'))) fail('the build is a preview');

mkdirSync(releaseDir, { recursive: true });
cpSync(dist, join(releaseDir, 'site'), { recursive: true, filter: (src) => !/[\\/]_(headers|redirects)$/.test(src) });
writeFileSync(join(releaseDir, 'routes.caddy'), caddyRoutes(headers, redirects));
writeFileSync(join(releaseDir, 'admin-release.txt'), `commit ${commit}\napi ${API}\n`);
console.log(`caddy-admin-release: ${headers.length} header rules, ${redirects.length} redirect rules, commit ${commit} → ${releaseDir}`);
