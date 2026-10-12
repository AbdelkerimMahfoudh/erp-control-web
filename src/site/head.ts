/**
 * The `<head>` of a public page (docs/74 §5), computed once for both the prerenderer (`headHtml`) and the page itself
 * after a client-side navigation (`applyHead`): title, description, canonical address, the three language
 * alternates, robots, Open Graph and — only from values TSX-MR supplied — structured data. Nothing here states a
 * rating, a review, a price or an availability.
 */
import { LANGUAGES, OG_LOCALE, type Language } from '../i18n/languages';
import type { SiteInputs } from '../config/schema';
import { pathOf, routeById, type PublicRouteId } from './routes';

export const SOCIAL_IMAGE_PATH = '/social/og-default.png';
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export interface HeadInput {
  id: PublicRouteId;
  lang: Language;
  title: string;
  description: string;
  site: Pick<SiteInputs, 'publicSiteOrigin' | 'displayName' | 'legalName' | 'country' | 'city' | 'address' | 'supportEmail'>;
  /** Inputs the preview filled with test values: never put into structured data. */
  filled: readonly string[];
  preview: boolean;
  /** The product's own name, for the Dukan ERP page's structured data. */
  productName: string;
}

export interface Head {
  lang: Language;
  title: string;
  description: string;
  canonical: string | null;
  alternates: { hreflang: string; href: string }[];
  robots: string;
  meta: { property?: string; name?: string; content: string }[];
  jsonLd: object[];
}

function absolute(origin: string, path: string): string | null {
  return origin ? `${origin}${path}` : null;
}

export function headFor(h: HeadInput): Head {
  const route = routeById(h.id);
  const origin = h.site.publicSiteOrigin;
  const canonical = absolute(origin, pathOf(h.id, h.lang));
  const indexable = route.indexable && !h.preview;
  const alternates = origin
    ? [
        ...LANGUAGES.map((l) => ({ hreflang: l, href: `${origin}${pathOf(h.id, l)}` })),
        { hreflang: 'x-default', href: `${origin}${pathOf(h.id, 'en')}` },
      ]
    : [];
  const image = absolute(origin, SOCIAL_IMAGE_PATH);
  const meta: Head['meta'] = [
    { name: 'description', content: h.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: h.site.displayName },
    { property: 'og:title', content: h.title },
    { property: 'og:description', content: h.description },
    { property: 'og:locale', content: OG_LOCALE[h.lang] },
    ...LANGUAGES.filter((l) => l !== h.lang).map((l) => ({ property: 'og:locale:alternate', content: OG_LOCALE[l] })),
    ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
    ...(image
      ? [
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: String(SOCIAL_IMAGE_SIZE.width) },
          { property: 'og:image:height', content: String(SOCIAL_IMAGE_SIZE.height) },
          { name: 'twitter:card', content: 'summary_large_image' },
        ]
      : [{ name: 'twitter:card', content: 'summary' }]),
  ];
  return {
    lang: h.lang,
    title: h.title,
    description: h.description,
    canonical,
    alternates,
    robots: indexable ? 'index, follow' : 'noindex, nofollow',
    meta,
    jsonLd: indexable ? structuredData(h, canonical) : [],
  };
}

/** Only what TSX-MR supplied: a field the preview filled is left out, and nothing is guessed. */
function structuredData(h: HeadInput, canonical: string | null): object[] {
  const real = (name: string, value: string) => (value && !h.filled.includes(name) ? value : undefined);
  const origin = real('publicSiteOrigin', h.site.publicSiteOrigin);
  if (!origin) return [];
  const address = real('address', h.site.address)
    ? {
        '@type': 'PostalAddress',
        streetAddress: h.site.address,
        addressLocality: real('city', h.site.city),
        addressCountry: real('country', h.site.country),
      }
    : undefined;
  const organization = {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: h.site.displayName,
    legalName: real('legalName', h.site.legalName),
    url: origin,
    email: real('supportEmail', h.site.supportEmail),
    address,
  };
  const graph: object[] = [organization];
  if (h.id === 'dukanErp' && canonical) {
    graph.push({
      '@type': 'SoftwareApplication',
      name: h.productName,
      applicationCategory: 'BusinessApplication',
      url: canonical,
      publisher: { '@id': `${origin}/#organization` },
    });
  }
  return [{ '@context': 'https://schema.org', '@graph': graph }];
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON inside a script element: `<` escaped so no text can close the element. */
const safeJson = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c');

/** The head as markup, for the prerendered file. */
export function headHtml(head: Head): string {
  return [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="robots" content="${head.robots}" />`,
    ...(head.canonical ? [`<link rel="canonical" href="${escapeHtml(head.canonical)}" />`] : []),
    ...head.alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${escapeHtml(a.href)}" />`),
    ...head.meta.map((m) => `<meta ${m.property ? `property="${m.property}"` : `name="${m.name}"`} content="${escapeHtml(m.content)}" />`),
    ...head.jsonLd.map((j) => `<script type="application/ld+json">${safeJson(j)}</script>`),
  ].join('\n    ');
}

/** The same head, applied after a navigation inside the page (no reload). */
export function applyHead(head: Head): void {
  if (typeof document === 'undefined') return;
  document.title = head.title;
  const managed = document.head.querySelectorAll('[data-head]');
  managed.forEach((n) => n.remove());
  // The prerendered tags of the first page are replaced too, so a navigation never leaves the old page's.
  document.head.querySelectorAll('meta[name="description"], meta[name="robots"], link[rel="canonical"], link[rel="alternate"][hreflang], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]').forEach((n) => n.remove());
  const add = (tag: string, attrs: Record<string, string>) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.setAttribute('data-head', '');
    document.head.appendChild(el);
  };
  add('meta', { name: 'robots', content: head.robots });
  if (head.canonical) add('link', { rel: 'canonical', href: head.canonical });
  for (const a of head.alternates) add('link', { rel: 'alternate', hreflang: a.hreflang, href: a.href });
  for (const m of head.meta) add('meta', m.property ? { property: m.property, content: m.content } : { name: m.name!, content: m.content });
  // Structured data is for crawlers, which read the prerendered file; it is not re-added here.
}

/** What a protected page's head says, wherever it is reached. */
export function applyProtectedHead(title: string): void {
  if (typeof document === 'undefined') return;
  document.title = title;
  document.head.querySelectorAll('meta[name="robots"]').forEach((n) => n.remove());
  const el = document.createElement('meta');
  el.setAttribute('name', 'robots');
  el.setAttribute('content', 'noindex, nofollow');
  document.head.appendChild(el);
}
