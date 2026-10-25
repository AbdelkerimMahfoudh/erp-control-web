import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORTAL_API_ORIGIN, PORTAL_WEBSITE_ORIGIN, PUBLIC_WEBSITE_ORIGIN, gateOfSurface, readInputs, releaseProblems } from '../src/config/schema';
import { surfaceOf } from '../src/config/surface';
import { contentSecurityPolicy, headersFile, redirectsFile, robotsTxt, securityTxt, sitemapXml, webManifest } from '../src/site/generated';
import { PORTAL_HOME, protectedPrefixesFor, publicRoutesFor } from '../src/site/routes';

/**
 * A portal build (`VITE_SITE_SURFACE=portal`, the owner's brief of 2026-10-18, docs/101): the Dukan ERP portal alone,
 * at https://dukan.tsxmr.com — the Owner's /subscription and the console — calling https://api.tsxmr.com, its legal
 * and support pages the company site's at https://tsxmr.com. Nothing of it is indexed.
 */
const PORTAL_REAL: Record<string, string> = {
  VITE_SITE_SURFACE: 'portal',
  VITE_PORTAL_ORIGIN: 'https://dukan.tsxmr.com',
  VITE_PUBLIC_SITE_ORIGIN: 'https://tsxmr.com',
  VITE_API_BASE: 'https://api.tsxmr.com/api/v1',
  VITE_OPERATOR_TYPE: 'company',
  VITE_ORGANIZATION_LEGAL_NAME: 'Registered Name SARL',
  VITE_ORGANIZATION_LEGAL_FORM: 'SARL',
  VITE_ORGANIZATION_REGISTRATION_NUMBER: 'RC 0000',
  VITE_ORGANIZATION_CITY: 'Nouakchott',
  VITE_ORGANIZATION_ADDRESS: 'Street 1',
  VITE_SUPPORT_EMAIL: 'support@company-domain.mr',
  VITE_PRIVACY_EMAIL: 'privacy@company-domain.mr',
  VITE_SECURITY_EMAIL: 'security@company-domain.mr',
  VITE_SUPPORT_HOURS: 'Sunday to Thursday, 9:00 to 17:00 (Nouakchott time)',
  VITE_SUPPORT_RESPONSE_TIME: 'Within two working days',
  VITE_SUPPORT_LANGUAGES: 'Arabic, French and English',
  VITE_ACCOUNT_DELETION_CHANNEL: 'whatsapp',
  VITE_LEGAL_EFFECTIVE_DATE: '2026-11-01',
};
const site = readInputs(PORTAL_REAL, 'production').inputs;

describe('the portal’s gate (PORTAL, a portal build)', () => {
  it('names the surface and its gate; a value it does not know is a full build', () => {
    expect(site.siteSurface).toBe('portal');
    expect(gateOfSurface('portal')).toBe('PORTAL');
    expect([surfaceOf('portal'), surfaceOf('public'), surfaceOf(undefined), surfaceOf('marketing')]).toEqual(['portal', 'public', 'full', 'full']);
  });

  it('opens on its three origins exactly: the portal’s, the company site’s and the API’s', () => {
    expect([PORTAL_WEBSITE_ORIGIN, PUBLIC_WEBSITE_ORIGIN, PORTAL_API_ORIGIN]).toEqual(['https://dukan.tsxmr.com', 'https://tsxmr.com', 'https://api.tsxmr.com']);
    expect(releaseProblems(PORTAL_REAL, [])).toEqual([]);
  });

  it('is published at https://dukan.tsxmr.com only — never portal.tsxmr.com — and needs its origin', () => {
    for (const origin of ['https://portal.tsxmr.com', 'https://tsxmr.com', 'https://www.dukan.tsxmr.com', 'https://dukan.tsxmr.mr']) {
      expect(releaseProblems({ ...PORTAL_REAL, VITE_PORTAL_ORIGIN: origin }, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_PORTAL_ORIGIN:wrong_origin']);
    }
    const { VITE_PORTAL_ORIGIN: _, ...without } = PORTAL_REAL;
    expect(releaseProblems(without, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_PORTAL_ORIGIN:missing']);
  });

  it('links its legal pages to https://tsxmr.com and calls the API at https://api.tsxmr.com only', () => {
    expect(releaseProblems({ ...PORTAL_REAL, VITE_PUBLIC_SITE_ORIGIN: 'https://www.tsxmr.com' }, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_PUBLIC_SITE_ORIGIN:wrong_origin']);
    expect(releaseProblems({ ...PORTAL_REAL, VITE_API_BASE: 'https://api.company-domain.mr/api/v1' }, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_API_BASE:wrong_origin']);
  });

  it('keeps every PORTAL rule: the legal texts approved, the support facts given', () => {
    const legal = releaseProblems(PORTAL_REAL, [{ id: 'legal_review', summary: 'x' }]);
    expect(legal.map((p) => p.problem)).toEqual(['legal_blocker']);
    const { VITE_SUPPORT_HOURS: _, ...noHours } = PORTAL_REAL;
    expect(releaseProblems(noHours, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_SUPPORT_HOURS:missing']);
  });
});

describe('what a portal build publishes', () => {
  it('no page of the company site; the Owner’s page and the console behind a sign-in, and the registration link’s landing', () => {
    expect(publicRoutesFor('portal')).toEqual([]);
    expect(protectedPrefixesFor('portal')).toEqual([PORTAL_HOME, '/admin', '/join']);
    expect(PORTAL_HOME).toBe('/subscription');
  });

  it('robots: nothing is crawled, production or preview; no sitemap names anything', () => {
    expect(robotsTxt(site, false)).toBe('User-agent: *\nDisallow: /\n');
    expect(robotsTxt(site, true)).toBe('User-agent: *\nDisallow: /\n');
    expect(sitemapXml(site, '2026-10-18')).not.toMatch(/<loc>/);
  });

  it('headers: noindex on every address, no-store on the signed-in areas, the API allowed, framing refused; no page for the app', () => {
    const file = headersFile(site, false);
    const [all] = file.split('\n\n');
    expect(all).toMatch(/^\/\*\n/);
    expect(all).toContain('X-Robots-Tag: noindex, nofollow');
    expect(all).toContain('X-Frame-Options: DENY');
    expect(all).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    for (const p of ['/subscription', '/subscription/*', '/admin', '/admin/*', '/join', '/join/*', '/account', '/account/*', '/app-shell.html']) {
      expect(file).toContain(`${p}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
    }
    expect(file).not.toContain('/in-app/');
    expect(contentSecurityPolicy(site)).toContain("connect-src 'self' https://api.tsxmr.com;");
  });

  it('rewrites: the root and the old address go to /subscription, the signed-in areas load the shell', () => {
    expect(redirectsFile(site)).toBe(
      [
        '/ /subscription 302',
        '/account /subscription 301',
        '/account/* /subscription 301',
        '/subscription /app-shell.html 200',
        '/subscription/* /app-shell.html 200',
        '/admin /app-shell.html 200',
        '/admin/* /app-shell.html 200',
        '/join /app-shell.html 200',
        '/join/* /app-shell.html 200',
        '',
      ].join('\n'),
    );
  });

  it('the manifest is the product’s and opens on the Owner’s page; security.txt names the portal as its own address', () => {
    const manifest = JSON.parse(webManifest(site, '#000', '#fff'));
    expect([manifest.name, manifest.short_name, manifest.start_url]).toEqual(['Dukan ERP', 'Dukan ERP', '/subscription']);
    expect(securityTxt(site, new Date('2026-10-18T00:00:00Z'))).toContain('Canonical: https://dukan.tsxmr.com/.well-known/security.txt');
  });
});

describe('the build takes the portal’s stub, and its files carry none of the company site', () => {
  const root = process.cwd();
  const read = (f: string) => readFileSync(join(root, f), 'utf8');

  it('vite aliases the company site’s pages to the stub in a portal build, and the stub imports no public page', () => {
    expect(read('vite.config.ts')).toMatch(/surface === 'portal'\) return \[\{ find: \/\^\\\.\\\/public-areas\$\/, replacement: stub\('\.\/src\/public-areas\.portal\.tsx'\) \}\]/);
    const stub = read('src/public-areas.portal.tsx');
    expect(stub).not.toMatch(/pages\/public|components\/Chrome'|Legal|Home|Apply/);
  });

  it('the prerenderer writes the shell for the portal and no page of the company site; the bundle audit has a portal mode', () => {
    const prerender = read('scripts/prerender.mjs');
    expect(prerender).toMatch(/const portal = ssr\.SURFACE === 'portal';/);
    expect(prerender).toMatch(/for \(const lang of portal \? \[\] : ssr\.LANGUAGES\)/);
    expect(prerender).toMatch(/!portal\) write\('sitemap\.xml'/);
    const audit = read('scripts/audit-bundle.mjs');
    expect(audit).toContain("process.argv.includes('--portal')");
    expect(audit).toContain('portal.tsxmr.com');
  });
});
