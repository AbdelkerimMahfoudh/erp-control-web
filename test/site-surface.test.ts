import { describe, expect, it } from 'vitest';
import { formatProblems, readInputs, releaseProblems } from '../src/config/schema';
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

/** The pre-launch website's own facts (the PUBLIC_WEBSITE gate, docs/96): identity, contacts, the date — and its origin. */
const PUBLIC_REAL: Record<string, string> = {
  VITE_SITE_SURFACE: 'public',
  VITE_PUBLIC_SITE_ORIGIN: 'https://tsxmr.com',
  VITE_ORGANIZATION_LEGAL_NAME: 'Registered Name SARL',
  VITE_ORGANIZATION_LEGAL_FORM: 'SARL',
  VITE_ORGANIZATION_REGISTRATION_NUMBER: 'RC 0000',
  VITE_ORGANIZATION_CITY: 'Nouakchott',
  VITE_ORGANIZATION_ADDRESS: 'Street 1',
  VITE_SUPPORT_EMAIL: 'support@company-domain.mr',
  VITE_PRIVACY_EMAIL: 'privacy@company-domain.mr',
  VITE_SECURITY_EMAIL: 'security@company-domain.mr',
  VITE_LEGAL_EFFECTIVE_DATE: '2026-11-01',
};

describe('the PUBLIC_WEBSITE gate (a public build)', () => {
  it('opens on the TSX-MR identity, contacts, effective date and origin alone — no API, no deletion channel, no support hours', () => {
    expect(releaseProblems(PUBLIC_REAL, [])).toEqual([]);
  });

  it('asks for every fact it publishes, and names exactly those', () => {
    const missing = releaseProblems({ VITE_SITE_SURFACE: 'public' }, []).filter((p) => p.problem === 'missing').map((p) => p.env).sort();
    expect(missing).toEqual(
      ['VITE_LEGAL_EFFECTIVE_DATE', 'VITE_ORGANIZATION_ADDRESS', 'VITE_ORGANIZATION_CITY', 'VITE_ORGANIZATION_LEGAL_FORM', 'VITE_ORGANIZATION_LEGAL_NAME', 'VITE_ORGANIZATION_REGISTRATION_NUMBER', 'VITE_PRIVACY_EMAIL', 'VITE_PUBLIC_SITE_ORIGIN', 'VITE_SECURITY_EMAIL', 'VITE_SUPPORT_EMAIL'].sort(),
    );
  });

  it('is published at https://tsxmr.com only', () => {
    for (const origin of ['https://www.tsxmr.com', 'https://dukan.tsxmr.com', 'https://tsxmr.pages.dev']) {
      expect(releaseProblems({ ...PUBLIC_REAL, VITE_PUBLIC_SITE_ORIGIN: origin }, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_PUBLIC_SITE_ORIGIN:wrong_origin']);
    }
  });

  it('refuses any portal, API, console or app-store address: the pre-launch website links to none', () => {
    for (const [env, value] of [
      ['VITE_PORTAL_ORIGIN', 'https://dukan.tsxmr.com'],
      ['VITE_API_BASE', 'https://api.tsxmr.com/api/v1'],
      ['VITE_ADMIN_SITE_ORIGIN', 'https://admin.tsxmr.com'],
      ['VITE_APPLE_APP_STORE_URL', 'https://apps.apple.com/app/id1'],
      ['VITE_GOOGLE_PLAY_URL', 'https://play.google.com/store/apps/details?id=mr.tsxmr.dukanerp'],
    ] as [string, string][]) {
      expect(releaseProblems({ ...PUBLIC_REAL, [env]: value }, []).map((p) => `${p.env}:${p.problem}`)).toEqual([`${env}:forbidden`]);
    }
  });

  it('keeps refusing a test value, a placeholder, a legal blocker and an unapproved text', () => {
    expect(releaseProblems({ ...PUBLIC_REAL, VITE_SUPPORT_EMAIL: 'support@preview.invalid' }, []).map((p) => p.problem)).toEqual(['test_value']);
    expect(releaseProblems({ ...PUBLIC_REAL, VITE_ORGANIZATION_ADDRESS: '[TO BE PROVIDED]' }, []).map((p) => p.problem)).toEqual(['placeholder']);
    const legal = releaseProblems(PUBLIC_REAL, [{ id: 'legal_review', summary: 'x' }], { drafts: ['privacy'], placeholders: [] });
    expect(legal.map((p) => p.problem)).toEqual(['legal_blocker', 'legal_draft']);
    expect(formatProblems(legal, 'PUBLIC_WEBSITE')).toMatch(/\(gate PUBLIC_WEBSITE\)\. Nothing was published\./);
  });

  it('the PORTAL gate (a full build) is as strict as before: the API, the deletion channel and support facts are still required', () => {
    const { VITE_SITE_SURFACE: _, ...full } = PUBLIC_REAL;
    const missing = releaseProblems(full, []).map((p) => `${p.env}:${p.problem}`);
    for (const env of ['VITE_API_BASE', 'VITE_ACCOUNT_DELETION_CHANNEL', 'VITE_SUPPORT_HOURS', 'VITE_SUPPORT_LANGUAGES', 'VITE_SUPPORT_RESPONSE_TIME']) expect(missing).toContain(`${env}:missing`);
    expect(missing.some((m) => m.includes('forbidden') || m.includes('wrong_origin'))).toBe(false);
  });

  it('refuses an unknown surface; a build that names none is a full one, as before', () => {
    expect(releaseProblems({ ...PUBLIC_REAL, VITE_SITE_SURFACE: 'marketing', VITE_API_BASE: 'https://api.company-domain.mr/api/v1', VITE_ACCOUNT_DELETION_CHANNEL: 'whatsapp', VITE_SUPPORT_HOURS: 'x', VITE_SUPPORT_LANGUAGES: 'x', VITE_SUPPORT_RESPONSE_TIME: 'x' }, []).map((p) => `${p.env}:${p.problem}`)).toEqual(['VITE_SITE_SURFACE:malformed']);
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
