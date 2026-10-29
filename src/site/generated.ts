/**
 * The files the prerenderer writes beside the pages (docs/74 §5–§6), as pure functions of the inputs so the tests
 * read exactly what is published: robots, sitemap, the host's security headers and rewrites (Cloudflare Pages
 * `_headers` / `_redirects` syntax), security.txt and the web manifest.
 */
import { LANGUAGES } from '../i18n/languages';
import type { SiteInputs } from '../config/schema';
import { surfaceOf as namedSurface } from '../config/surface';
import { IN_APP_PREFIX, JOIN_PATH, LANGUAGE_PREFIX, pathOf, PORTAL_HOME, protectedPrefixesFor, publicRoutesFor, RETIRED_PREFIXES } from './routes';

/** The surface a generated file describes; `full` when a caller does not say (`schema.ts` SURFACES). */
type WithSurface = Partial<Pick<SiteInputs, 'siteSurface'>>;
const surfaceOf = (site: WithSurface) => namedSurface(site.siteSurface);

/** The addresses that send on to the Owner's page, in a build that has it (`routes.ts` RETIRED_PREFIXES). */
const retiredFor = (site: WithSurface) => (surfaceOf(site) === 'public' ? [] : RETIRED_PREFIXES);

/** The shell the protected areas load: no prerendered content, never indexed. */
export const APP_SHELL = '/app-shell.html';

/** Where a public page's file goes: `/about` → `about.html`, the home → `index.html`, `/fr` → `fr.html`. */
export function fileForPath(path: string): string {
  return path === '/' ? 'index.html' : `${path.slice(1)}.html`;
}

/** Nothing of a preview, and nothing of the portal, is crawled: the portal is a signed-in service, never a page to find. */
export function robotsTxt(site: Pick<SiteInputs, 'publicSiteOrigin'> & WithSurface, preview: boolean): string {
  if (preview || surfaceOf(site) === 'portal') return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    ...[...protectedPrefixesFor(surfaceOf(site)), ...retiredFor(site)].map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${site.publicSiteOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemapXml(site: Pick<SiteInputs, 'publicSiteOrigin'> & WithSurface, lastmod: string): string {
  const origin = site.publicSiteOrigin;
  const urls = publicRoutesFor(surfaceOf(site)).filter((r) => r.indexable).flatMap((r) =>
    LANGUAGES.map((lang) => {
      const alternates = LANGUAGES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${origin}${pathOf(r.id, l)}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${pathOf(r.id, 'en')}"/>`)
        .join('\n');
      return `  <url>\n    <loc>${origin}${pathOf(r.id, lang)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alternates}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function originOf(url: string): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

/** The Content Security Policy: same-origin everything, plus the API for requests (none in a public build). No inline script or style. */
export function contentSecurityPolicy(site: Pick<SiteInputs, 'apiBase'> & WithSurface): string {
  const api = surfaceOf(site) === 'public' ? null : originOf(site.apiBase);
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${api ? ` ${api}` : ''}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function headersFile(site: Pick<SiteInputs, 'apiBase'> & WithSurface, preview: boolean): string {
  const surface = surfaceOf(site);
  const common = [
    `Content-Security-Policy: ${contentSecurityPolicy(site)}`,
    // One year; `includeSubDomains` waits for the owner's decision on every subdomain (docs/45; staging never sends it).
    'Strict-Transport-Security: max-age=31536000',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy: same-origin',
    // Nothing of a preview is indexed, and nothing of the portal ever is (the owner's brief of 2026-10-18).
    ...(preview || surface === 'portal' ? ['X-Robots-Tag: noindex, nofollow'] : []),
  ];
  const blocks = [`/*\n${common.map((h) => `  ${h}`).join('\n')}`];
  for (const p of [...protectedPrefixesFor(surface), ...retiredFor(site)]) {
    blocks.push(`${p}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
    blocks.push(`${p}/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
  }
  if (surface !== 'public') blocks.push(`${APP_SHELL}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
  // A registration link carries its token in the address: nothing it leads to is told where it came from (0103).
  if (surface !== 'public') blocks.push(`${JOIN_PATH}\n  Referrer-Policy: no-referrer`);
  // The pages the mobile app opens: public texts, never indexed (their public pages are). Not on the portal.
  if (surface !== 'portal') for (const prefix of Object.values(LANGUAGE_PREFIX)) blocks.push(`${prefix}${IN_APP_PREFIX}/*\n  X-Robots-Tag: noindex, nofollow`);
  // Hashed assets never change; everything else is revalidated.
  blocks.push('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
  // The self-hosted fonts (theme/fonts.css): named by family, subset and weight, and renamed when they change.
  blocks.push('/fonts/*\n  Cache-Control: public, max-age=31536000, immutable');
  return `${blocks.join('\n\n')}\n`;
}

/**
 * The protected areas load the shell; the Owner's page's old address (`/account`, `/account/trial`) is sent on to it
 * for good; every other unknown address gets the 404 page (the host's default). The portal's own root is its Owner's
 * page — sent there, not served. A public build serves no protected area, so its file rewrites nothing.
 */
export function redirectsFile(site: WithSurface = {}): string {
  const surface = surfaceOf(site);
  const rules = [
    ...(surface === 'portal' ? [`/ ${PORTAL_HOME} 302`] : []),
    ...retiredFor(site).flatMap((p) => [`${p} ${PORTAL_HOME} 301`, `${p}/* ${PORTAL_HOME} 301`]),
    ...protectedPrefixesFor(surface).flatMap((p) => [`${p} ${APP_SHELL} 200`, `${p}/* ${APP_SHELL} 200`]),
  ];
  return rules.length ? `${rules.join('\n')}\n` : '';
}

/**
 * RFC 9116, only when TSX-MR supplied a security contact; it expires a year after the build. Its canonical address is
 * the origin it is published at: the portal's own on the portal.
 */
export function securityTxt(site: Pick<SiteInputs, 'securityEmail' | 'publicSiteOrigin'> & Partial<Pick<SiteInputs, 'portalOrigin'>> & WithSurface, builtAt: Date): string | null {
  if (!site.securityEmail) return null;
  const expires = new Date(builtAt.getTime() + 365 * 24 * 3600 * 1000).toISOString();
  const origin = surfaceOf(site) === 'portal' ? site.portalOrigin : site.publicSiteOrigin;
  return [
    `Contact: mailto:${site.securityEmail}`,
    `Expires: ${expires}`,
    'Preferred-Languages: en, fr, ar',
    ...(origin ? [`Canonical: ${origin}/.well-known/security.txt`] : []),
    '',
  ].join('\n');
}

/** The portal is the product's, and opens on the Owner's page; the company site is the company's, and opens on its home. */
export function webManifest(site: Pick<SiteInputs, 'displayName'> & WithSurface, themeColor: string, background: string): string {
  const portal = surfaceOf(site) === 'portal';
  const name = portal ? 'Dukan ERP' : site.displayName;
  return `${JSON.stringify(
    {
      name,
      short_name: name,
      start_url: portal ? PORTAL_HOME : '/',
      display: 'browser',
      background_color: background,
      theme_color: themeColor,
      // The portal wears the product's mark (the Dukan ledger, 2026-10-29); the company site keeps the company's.
      icons: portal
        ? [
            { src: '/icons/dukan-icon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: '/icons/dukan-icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/dukan-icon-512.png', sizes: '512x512', type: 'image/png' },
          ]
        : [
            { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
    },
    null,
    2,
  )}\n`;
}
