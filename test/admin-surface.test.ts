import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gateOfSurface, releaseProblems } from '../src/config/schema';
import { contentSecurityPolicy, headersFile, redirectsFile, robotsTxt, webManifest } from '../src/site/generated';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const GOOD = {
  VITE_SITE_SURFACE: 'admin',
  VITE_API_BASE: 'https://api.tsxmr.com/api/v1',
  VITE_ADMIN_SITE_ORIGIN: 'https://admin.tsxmr.com',
  VITE_PUBLIC_SITE_ORIGIN: 'https://tsxmr.com',
};
const site = { apiBase: GOOD.VITE_API_BASE, siteSurface: 'admin', publicSiteOrigin: GOOD.VITE_PUBLIC_SITE_ORIGIN, displayName: 'TSXMR' };

describe('the admin gate', () => {
  it('is its own, and asks only what the console needs', () => {
    expect(gateOfSurface('admin')).toBe('ADMIN');
    expect(releaseProblems(GOOD, [{ id: 'x', summary: 'a blocker of the customers’ service' }], { drafts: ['privacy'], placeholders: [] })).toEqual([]);
  });

  it.each([
    ['the test site', { VITE_ADMIN_SITE_ORIGIN: 'https://dukan-test.tsxmr.com' }],
    ['the customers’ portal', { VITE_ADMIN_SITE_ORIGIN: 'https://dukan.tsxmr.com' }],
    ['a local API', { VITE_API_BASE: 'http://127.0.0.1:3010/api/v1' }],
    ['a preview API', { VITE_API_BASE: 'https://staging.tsxmr.com/api/v1' }],
    ['an API without its base path', { VITE_API_BASE: 'https://api.tsxmr.com' }],
    ['no API', { VITE_API_BASE: '' }],
    ['no site origin', { VITE_ADMIN_SITE_ORIGIN: '' }],
    ['a portal origin beside it', { VITE_PORTAL_ORIGIN: 'https://dukan.tsxmr.com' }],
  ])('refuses %s', (_name, change) => {
    expect(releaseProblems({ ...GOOD, ...change }, []).length).toBeGreaterThan(0);
  });
});

describe('the admin build’s generated files', () => {
  it('never indexes anything and names only its API', () => {
    expect(robotsTxt(site, false)).toBe('User-agent: *\nDisallow: /\n');
    expect(headersFile(site, false)).toMatch(/^\/\*\n(?: {2}.*\n)* {2}X-Robots-Tag: noindex, nofollow/);
    expect(contentSecurityPolicy(site)).toContain("connect-src 'self' https://api.tsxmr.com;");
  });

  it('serves the console and no address of the customers', () => {
    const redirects = redirectsFile(site);
    expect(redirects).toContain('/ /admin 302');
    expect(redirects).toContain('/admin/* /app-shell.html 200');
    expect(redirects).not.toMatch(/subscription|account|join/);
    expect(headersFile(site, false)).not.toMatch(/subscription|account|join|in-app/);
    expect(JSON.parse(webManifest(site, '#000', '#fff')).start_url).toBe('/admin');
  });
});

describe('the bundles stay apart', () => {
  const comments = /\/\*[\s\S]*?\*\//g;

  it('the admin routes import nothing of the customers', () => {
    const areas = read('src/protected-areas.admin.tsx').replace(comments, '');
    expect(areas).toMatch(/pages\/admin\/Admin'/);
    expect(areas).not.toMatch(/pages\/portal|pages\/join|Subscription|Join/);
    expect(read('src/public-areas.admin.tsx').replace(comments, '')).not.toMatch(/pages\/portal|pages\/public/);
  });

  it('the customers’ routes hold no console: /admin/proofs is reached only through the console', () => {
    expect(read('src/protected-areas.owner.tsx').replace(comments, '')).not.toMatch(/pages\/admin|Proofs/);
    expect(read('src/pages/admin/Admin.tsx')).toMatch(/Proofs/);
  });

  it('the audits refuse a crossing, the review of a payment proof included', () => {
    const audit = read('scripts/audit-bundle.mjs');
    expect(audit).toMatch(/consoleFree/);
    expect(audit).toContain('platform\\/payment-proofs');
    expect(audit).toContain('platform\\/my-subscription');
  });

  it('a production build holds no local API address to fall back on', () => {
    expect(read('src/api/client.ts')).toMatch(/__LOCAL_API_FALLBACK__\)/);
    expect(read('vite.config.ts')).toMatch(/__LOCAL_API_FALLBACK__: JSON\.stringify\(mode !== 'production'\)/);
  });
});
