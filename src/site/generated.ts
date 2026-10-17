/**
 * The files the prerenderer writes beside the pages (docs/74 §5–§6), as pure functions of the inputs so the tests
 * read exactly what is published: robots, sitemap, the host's security headers and rewrites (Cloudflare Pages
 * `_headers` / `_redirects` syntax), security.txt and the web manifest.
 */
import { LANGUAGES } from '../i18n/languages';
import type { SiteInputs } from '../config/schema';
import { IN_APP_PREFIX, LANGUAGE_PREFIX, pathOf, PROTECTED_PREFIXES, protectedPrefixesFor, publicRoutesFor, TRIAL_LANDING } from './routes';

/** The surface a generated file describes; `full` when a caller does not say (`schema.ts` SURFACES). */
type WithSurface = Partial<Pick<SiteInputs, 'siteSurface'>>;
const surfaceOf = (site: WithSurface) => (site.siteSurface === 'public' ? 'public' : 'full');

/** The shell the protected areas load: no prerendered content, never indexed. */
export const APP_SHELL = '/app-shell.html';

/** Where a public page's file goes: `/about` → `about.html`, the home → `index.html`, `/fr` → `fr.html`. */
export function fileForPath(path: string): string {
  return path === '/' ? 'index.html' : `${path.slice(1)}.html`;
}

export function robotsTxt(site: Pick<SiteInputs, 'publicSiteOrigin'>, preview: boolean): string {
  if (preview) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    ...PROTECTED_PREFIXES.map((p) => `Disallow: ${p}`),
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
  const full = surfaceOf(site) === 'full';
  const common = [
    `Content-Security-Policy: ${contentSecurityPolicy(site)}`,
    // One year; `includeSubDomains` waits for the owner's decision on every subdomain (docs/45; staging never sends it).
    'Strict-Transport-Security: max-age=31536000',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy: same-origin',
    ...(preview ? ['X-Robots-Tag: noindex, nofollow'] : []),
  ];
  const blocks = [`/*\n${common.map((h) => `  ${h}`).join('\n')}`];
  for (const p of protectedPrefixesFor(surfaceOf(site))) {
    blocks.push(`${p}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
    blocks.push(`${p}/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
  }
  // The free trial's setup link lands here with its token in the address (`?t=` from WhatsApp): the page's own
  // scripts and styles load before the token is taken out of it, so no request may carry it as a referrer. The site's
  // policy is detached first (`! `), or the host would join the two values. The landing answers with a trailing slash
  // too (`/account/trial/?t=`), so that address is covered by its own rule: refusing the token there would not help,
  // as the page's files are asked for — with the address as referrer — before any script could refuse anything.
  if (full) {
    for (const path of [TRIAL_LANDING, `${TRIAL_LANDING}/*`]) blocks.push(`${path}\n  ! Referrer-Policy\n  Referrer-Policy: no-referrer`);
    blocks.push(`${APP_SHELL}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
  }
  // The pages the mobile app opens: public texts, never indexed (their public pages are).
  for (const prefix of Object.values(LANGUAGE_PREFIX)) blocks.push(`${prefix}${IN_APP_PREFIX}/*\n  X-Robots-Tag: noindex, nofollow`);
  // Hashed assets never change; everything else is revalidated.
  blocks.push('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
  return `${blocks.join('\n\n')}\n`;
}

/**
 * The protected areas load the shell; every other unknown address gets the 404 page (the host's default). A public
 * build serves no protected area, so its file rewrites nothing.
 */
export function redirectsFile(site: WithSurface = {}): string {
  const rules = protectedPrefixesFor(surfaceOf(site)).flatMap((p) => [`${p} ${APP_SHELL} 200`, `${p}/* ${APP_SHELL} 200`]);
  return rules.length ? `${rules.join('\n')}\n` : '';
}

/** RFC 9116, only when TSX-MR supplied a security contact; it expires a year after the build. */
export function securityTxt(site: Pick<SiteInputs, 'securityEmail' | 'publicSiteOrigin'>, builtAt: Date): string | null {
  if (!site.securityEmail) return null;
  const expires = new Date(builtAt.getTime() + 365 * 24 * 3600 * 1000).toISOString();
  return [
    `Contact: mailto:${site.securityEmail}`,
    `Expires: ${expires}`,
    'Preferred-Languages: en, fr, ar',
    ...(site.publicSiteOrigin ? [`Canonical: ${site.publicSiteOrigin}/.well-known/security.txt`] : []),
    '',
  ].join('\n');
}

export function webManifest(site: Pick<SiteInputs, 'displayName'>, themeColor: string, background: string): string {
  return `${JSON.stringify(
    {
      name: site.displayName,
      short_name: site.displayName,
      start_url: '/',
      display: 'browser',
      background_color: background,
      theme_color: themeColor,
      icons: [
        { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  )}\n`;
}
