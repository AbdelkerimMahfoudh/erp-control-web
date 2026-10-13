import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../src/i18n/languages';
import { headFor, headHtml } from '../src/site/head';
import { metaFor } from '../src/site/meta';
import { contentSecurityPolicy, fileForPath, headersFile, redirectsFile, robotsTxt, securityTxt, sitemapXml } from '../src/site/generated';
import { isProtectedPath, localizedPath, pathOf, PUBLIC_ROUTES, publicRouteAt, splitLanguage } from '../src/site/routes';

const ORIGIN = 'https://www.company-domain.mr';
const SITE = {
  publicSiteOrigin: ORIGIN,
  apiBase: 'https://api.company-domain.mr/api/v1',
  displayName: 'TSX-MR',
  legalName: 'Registered Name SARL',
  country: 'Mauritania',
  city: 'Nouakchott',
  address: 'Street 1',
  supportEmail: 'support@company-domain.mr',
  securityEmail: '',
};

describe('the public routes (docs/74 §2)', () => {
  it('every page exists in every language, and the address names the language', () => {
    for (const r of PUBLIC_ROUTES) {
      for (const lang of LANGUAGES) {
        const path = pathOf(r.id, lang);
        expect(splitLanguage(path)).toEqual({ lang, path: r.path });
        expect(publicRouteAt(path)).toEqual({ route: r, lang });
      }
    }
    expect(localizedPath('fr', '/')).toBe('/fr');
    expect(localizedPath('ar', '/privacy')).toBe('/ar/privacy');
    expect(fileForPath('/')).toBe('index.html');
    expect(fileForPath('/ar')).toBe('ar.html');
    expect(fileForPath('/fr/products/dukan-erp')).toBe('fr/products/dukan-erp.html');
  });

  it('the protected areas are never public routes', () => {
    for (const p of ['/account', '/account/x', '/admin', '/admin/businesses/1']) {
      expect(isProtectedPath(p)).toBe(true);
      expect(publicRouteAt(p)).toBeNull();
    }
    expect(PUBLIC_ROUTES.some((r) => isProtectedPath(r.path))).toBe(false);
    // A public page whose name merely begins like a protected area is not one.
    expect(isProtectedPath('/account-deletion')).toBe(false);
  });

  it('the status page and the sign-in page are reachable but never indexed', () => {
    const noindex = PUBLIC_ROUTES.filter((r) => !r.indexable).map((r) => r.id);
    expect(noindex.sort()).toEqual(['applicationStatus', 'login']);
  });

  it('every page has a title and a description in every language', () => {
    for (const r of PUBLIC_ROUTES) {
      for (const lang of LANGUAGES) {
        const m = metaFor(r.id, lang);
        expect(m.title.length).toBeGreaterThan(3);
        expect(m.description.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('the head (docs/74 §5)', () => {
  const input = (over: Partial<Parameters<typeof headFor>[0]> = {}) =>
    headFor({ id: 'dukanErp', lang: 'fr', title: 'Dukan ERP — TSX-MR', description: 'A description of the page.', site: SITE, filled: [], preview: false, productName: 'Dukan ERP', ...over });

  it('names its canonical address and the three language alternates', () => {
    const h = input();
    expect(h.canonical).toBe(`${ORIGIN}/fr/products/dukan-erp`);
    expect(h.alternates).toEqual([
      { hreflang: 'en', href: `${ORIGIN}/products/dukan-erp` },
      { hreflang: 'fr', href: `${ORIGIN}/fr/products/dukan-erp` },
      { hreflang: 'ar', href: `${ORIGIN}/ar/products/dukan-erp` },
      { hreflang: 'x-default', href: `${ORIGIN}/products/dukan-erp` },
    ]);
    expect(h.robots).toBe('index, follow');
    expect(h.meta).toContainEqual({ property: 'og:url', content: `${ORIGIN}/fr/products/dukan-erp` });
    expect(h.meta).toContainEqual({ property: 'og:locale', content: 'fr_FR' });
  });

  it('a preview and a non-indexable page say noindex and carry no structured data', () => {
    expect(input({ preview: true }).robots).toBe('noindex, nofollow');
    expect(input({ preview: true }).jsonLd).toEqual([]);
    expect(input({ id: 'login' }).robots).toBe('noindex, nofollow');
  });

  it('structured data states only supplied facts — never a filled test value, a rating, a price or an availability', () => {
    const json = JSON.stringify(input().jsonLd);
    expect(json).toContain('"legalName":"Registered Name SARL"');
    expect(json).toContain('"@type":"SoftwareApplication"');
    expect(json).not.toMatch(/aggregateRating|review|offers|price|availability|operatingSystem/i);
    const filled = JSON.stringify(input({ filled: ['legalName', 'address'] }).jsonLd);
    expect(filled).not.toContain('legalName');
    expect(filled).not.toContain('PostalAddress');
  });

  it('escapes what it writes', () => {
    const html = headHtml(input({ title: 'A "quoted" <title>' }));
    expect(html).toContain('<title>A &quot;quoted&quot; &lt;title&gt;</title>');
    expect(html).not.toMatch(/<\/script><script/);
  });
});

describe('the generated files (docs/74 §5–§6)', () => {
  it('robots: the protected areas are not crawled, a preview is not crawled at all', () => {
    const robots = robotsTxt(SITE, false);
    expect(robots).toContain('Disallow: /account');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(robotsTxt(SITE, true)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('sitemap: every indexable page in every language with its alternates, and nothing else', () => {
    const xml = sitemapXml(SITE, '2026-10-12');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const indexable = PUBLIC_ROUTES.filter((r) => r.indexable);
    expect(locs).toHaveLength(indexable.length * LANGUAGES.length);
    expect(locs).toContain(`${ORIGIN}/ar/privacy`);
    expect(xml).not.toMatch(/\/account[/<"]|\/admin|\/login|application-status/);
    expect(xml).toContain('hreflang="x-default"');
  });

  it('headers: a strict policy with no inline script or style, the API allowed, framing refused', () => {
    const csp = contentSecurityPolicy(SITE);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
    expect(csp).toContain("connect-src 'self' https://api.company-domain.mr");
    expect(csp).toContain("frame-ancestors 'none'");
    const file = headersFile(SITE, false);
    expect(file).toContain('X-Frame-Options: DENY');
    expect(file).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(file).toContain('Permissions-Policy: camera=()');
    expect(file).toContain('Strict-Transport-Security: max-age=31536000');
    expect(file).not.toContain('includeSubDomains');
    expect(file).toMatch(/\/admin\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
    expect(file).toMatch(/\/account\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
    // A production site's own pages are indexable: the catch-all block carries no robots header.
    expect(headersFile(SITE, false).split('\n\n')[0]).not.toContain('X-Robots-Tag');
    expect(headersFile(SITE, true)).toMatch(/^\/\*\n[\s\S]*X-Robots-Tag: noindex, nofollow/);
  });

  it('headers: the setup link’s landing sends no referrer — the site’s policy detached, never joined to it', () => {
    for (const preview of [false, true]) {
      const blocks = headersFile(SITE, preview).split('\n\n');
      const landing = blocks.filter((b) => b.startsWith('/account/trial\n'));
      expect(landing).toEqual(['/account/trial\n  ! Referrer-Policy\n  Referrer-Policy: no-referrer']);
      // After the catch-all and the account blocks, so the host applies it last; every other address keeps the site's.
      expect(blocks.indexOf(landing[0]!)).toBeGreaterThan(blocks.findIndex((b) => b.startsWith('/account/*\n')));
      expect(blocks[0]).toContain('Referrer-Policy: strict-origin-when-cross-origin');
      expect(blocks.filter((b) => b.includes('no-referrer'))).toHaveLength(1);
    }
  });

  it('rewrites: only the protected areas load the shell; other unknown addresses stay 404', () => {
    expect(redirectsFile()).toBe('/account /app-shell.html 200\n/account/* /app-shell.html 200\n/admin /app-shell.html 200\n/admin/* /app-shell.html 200\n');
  });

  it('security.txt exists only when a security contact was supplied', () => {
    expect(securityTxt(SITE, new Date('2026-10-12T00:00:00Z'))).toBeNull();
    const txt = securityTxt({ ...SITE, securityEmail: 'security@company-domain.mr' }, new Date('2026-10-12T00:00:00Z'))!;
    expect(txt).toContain('Contact: mailto:security@company-domain.mr');
    expect(txt).toContain('Expires: 2027-10-12T00:00:00.000Z');
  });
});
