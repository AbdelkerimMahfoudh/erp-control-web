/**
 * The files the prerenderer writes beside the pages (docs/74 §5–§6), as pure functions of the inputs so the tests
 * read exactly what is published: robots, sitemap, the host's security headers and rewrites (Cloudflare Pages
 * `_headers` / `_redirects` syntax), security.txt and the web manifest.
 */
import { LANGUAGES } from '../i18n/languages';
import type { SiteInputs } from '../config/schema';
import { pathOf, PROTECTED_PREFIXES, PUBLIC_ROUTES, TRIAL_LANDING } from './routes';

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

export function sitemapXml(site: Pick<SiteInputs, 'publicSiteOrigin'>, lastmod: string): string {
  const origin = site.publicSiteOrigin;
  const urls = PUBLIC_ROUTES.filter((r) => r.indexable).flatMap((r) =>
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

/** The Content Security Policy: same-origin everything, plus the API for requests. No inline script or style. */
export function contentSecurityPolicy(site: Pick<SiteInputs, 'apiBase'>): string {
  const api = originOf(site.apiBase);
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

export function headersFile(site: Pick<SiteInputs, 'apiBase'>, preview: boolean): string {
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
  for (const p of PROTECTED_PREFIXES) {
    blocks.push(`${p}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
    blocks.push(`${p}/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
  }
  // The free trial's setup link lands here with its token in the address (`?t=` from WhatsApp): the page's own
  // scripts and styles load before the token is taken out of it, so no request may carry it as a referrer. The site's
  // policy is detached first (`! `), or the host would join the two values. The landing answers with a trailing slash
  // too (`/account/trial/?t=`), so that address is covered by its own rule: refusing the token there would not help,
  // as the page's files are asked for — with the address as referrer — before any script could refuse anything.
  for (const path of [TRIAL_LANDING, `${TRIAL_LANDING}/*`]) blocks.push(`${path}\n  ! Referrer-Policy\n  Referrer-Policy: no-referrer`);
  blocks.push(`${APP_SHELL}\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store`);
  // Hashed assets never change; everything else is revalidated.
  blocks.push('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
  return `${blocks.join('\n\n')}\n`;
}

/** The protected areas load the shell; every other unknown address gets the 404 page (the host's default). */
export function redirectsFile(): string {
  return `${PROTECTED_PREFIXES.flatMap((p) => [`${p} ${APP_SHELL} 200`, `${p}/* ${APP_SHELL} 200`]).join('\n')}\n`;
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
