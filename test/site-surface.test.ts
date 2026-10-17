import { describe, expect, it } from 'vitest';
import { readInputs, releaseProblems } from '../src/config/schema';
import { accountHref } from '../src/components/AccountLink';
import { contentSecurityPolicy, headersFile, redirectsFile, sitemapXml } from '../src/site/generated';
import { API_ROUTE_IDS, IN_APP_ROUTE_IDS, pathOf, publicRoutesFor, PUBLIC_ROUTES } from '../src/site/routes';
import { LANGUAGES } from '../src/i18n/languages';
import * as stub from '../src/protected-areas.public';

/**
 * A public build (`VITE_SITE_SURFACE=public`, the owner's brief of 2026-10-17, docs/95): the public pages only, on an
 * origin of their own while the business account and the API live elsewhere.
 */
const REAL: Record<string, string> = {
  VITE_PUBLIC_SITE_ORIGIN: 'https://www.company-domain.mr',
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
const ORIGIN = REAL.VITE_PUBLIC_SITE_ORIGIN!;
const PORTAL = 'https://portal.company-domain.mr';

describe('the release rule of a public build', () => {
  it('does not ask for the API a public build never calls; a full build still does', () => {
    expect(releaseProblems({ ...REAL, VITE_SITE_SURFACE: 'public' }, [])).toEqual([]);
    expect(releaseProblems(REAL, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_API_BASE:missing']);
  });

  it('keeps every other refusal: a blank fact, a test value, a legal blocker or a draft still stops it', () => {
    const blank = releaseProblems({ ...REAL, VITE_SITE_SURFACE: 'public', VITE_SUPPORT_EMAIL: '' }, []);
    expect(blank.map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_SUPPORT_EMAIL:missing']);
    const test = releaseProblems({ ...REAL, VITE_SITE_SURFACE: 'public', VITE_PUBLIC_SITE_ORIGIN: 'https://preview.invalid' }, []);
    expect(test.map((p) => p.problem)).toEqual(['test_value']);
    const legal = releaseProblems({ ...REAL, VITE_SITE_SURFACE: 'public' }, [{ id: 'legal_review', summary: 'x' }], { drafts: ['privacy'], placeholders: [] });
    expect(legal.map((p) => p.problem)).toEqual(['legal_blocker', 'legal_draft']);
  });

  it('refuses an unknown surface and a portal origin that is not HTTPS', () => {
    expect(releaseProblems({ ...REAL, VITE_SITE_SURFACE: 'marketing', VITE_API_BASE: 'https://api.company-domain.mr/api/v1' }, []).map((p) => `${p.env}:${p.problem}`)).toEqual([
      'VITE_SITE_SURFACE:malformed',
    ]);
    expect(releaseProblems({ ...REAL, VITE_SITE_SURFACE: 'public', VITE_PORTAL_ORIGIN: 'http://portal.company-domain.mr' }, []).map((p) => `${p.env}:${p.problem}`)).toEqual([
      'VITE_PORTAL_ORIGIN:not_https',
    ]);
  });

  it('a build that names no surface is a full one, as before', () => {
    expect(readInputs({}, 'production').inputs.siteSurface).toBe('full');
    expect(readInputs({}, 'preview').inputs.siteSurface).toBe('full');
  });
});

describe('what a public build publishes', () => {
  const site = { ...readInputs({ ...REAL, VITE_SITE_SURFACE: 'public', VITE_API_BASE: 'https://api.company-domain.mr/api/v1' }, 'production').inputs };

  it('every public page but the three that need the API — the legal and support pages included', () => {
    const ids = publicRoutesFor('public').map((r) => r.id);
    for (const id of API_ROUTE_IDS) expect(ids).not.toContain(id);
    for (const id of ['home', 'support', 'privacy', 'terms', 'accountDeletion', 'privacyChoices', 'legalNotice', 'security', 'contact', 'dukanErp'] as const) expect(ids).toContain(id);
    // The pages the mobile app opens are all among them.
    for (const id of IN_APP_ROUTE_IDS) expect(ids).toContain(id);
    expect(publicRoutesFor('full')).toBe(PUBLIC_ROUTES);
  });

  it('sitemap: the published pages in every language, no application page', () => {
    const xml = sitemapXml(site, '2026-10-17');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(publicRoutesFor('public').filter((r) => r.indexable).length * LANGUAGES.length);
    expect(xml).not.toMatch(/\/apply|\/login|application-status|\/account[/<"]|\/admin/);
    for (const lang of LANGUAGES) expect(locs).toContain(`${ORIGIN}${pathOf('privacy', lang)}`);
  });

  it('rewrites nothing, so /account and /admin are unknown pages here (404)', () => {
    expect(redirectsFile(site)).toBe('');
    expect(redirectsFile()).toContain('/admin/* /app-shell.html 200');
  });

  it('headers: the same strict policy, with no API origin even when one is given, and no protected-area rules', () => {
    const csp = contentSecurityPolicy(site);
    expect(csp).toContain("connect-src 'self';");
    expect(csp).not.toContain('company-domain');
    const file = headersFile(site, false);
    expect(file).toContain('X-Frame-Options: DENY');
    expect(file).toContain('Strict-Transport-Security: max-age=31536000');
    expect(file).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
    expect(file).not.toMatch(/^\/(account|admin)/m);
    expect(file).not.toContain('app-shell');
    expect(file).not.toContain('/account/trial');
    // The pages the app opens stay public and unindexed.
    expect(file).toContain('/in-app/*\n  X-Robots-Tag: noindex, nofollow');
  });

  it('the protected areas’ stub holds neither area', () => {
    expect(stub.PROTECTED_AREAS_BUILT).toBe(false);
    expect(stub.ProtectedRoutes()).toBeNull();
  });
});

describe('links into the business account', () => {
  it('a full build links on its own origin', () => {
    expect(accountHref('login', 'fr', { siteSurface: 'full', portalOrigin: '' })).toEqual({ to: '/fr/login' });
  });

  it('a public build links nowhere until a portal origin is given, then to the same page there', () => {
    expect(accountHref('apply', 'en', { siteSurface: 'public', portalOrigin: '' })).toBeNull();
    expect(accountHref('apply', 'ar', { siteSurface: 'public', portalOrigin: PORTAL })).toEqual({ href: `${PORTAL}/ar/apply` });
    expect(accountHref('login', 'en', { siteSurface: 'public', portalOrigin: PORTAL })).toEqual({ href: `${PORTAL}/login` });
  });
});
