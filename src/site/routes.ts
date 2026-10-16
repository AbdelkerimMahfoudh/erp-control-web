/**
 * Every public page, once (docs/74 §2): its path, whether search engines may index it, and its place in the
 * sitemap. The router, the prerenderer, the sitemap, the robots file and the page heads all read this table, so a
 * page cannot exist in one and be forgotten in another.
 *
 * Languages are in the path — English unprefixed, French under `/fr`, Arabic under `/ar` — so each language is a
 * real page with its own `lang`, `dir` and alternates. The protected areas (`/account`, `/admin`) are not here: they
 * are never prerendered, never in the sitemap, and every response for them says `noindex`.
 */
import type { Language } from '../i18n/languages';

export type PublicRouteId =
  | 'home'
  | 'about'
  | 'products'
  | 'dukanErp'
  | 'contact'
  | 'support'
  | 'privacy'
  | 'terms'
  | 'accountDeletion'
  | 'privacyChoices'
  | 'legalNotice'
  | 'security'
  | 'apply'
  | 'applicationStatus'
  | 'login';

export interface PublicRoute {
  id: PublicRouteId;
  /** The English path; other languages prefix it. */
  path: string;
  indexable: boolean;
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { id: 'home', path: '/', indexable: true },
  { id: 'about', path: '/about', indexable: true },
  { id: 'products', path: '/products', indexable: true },
  { id: 'dukanErp', path: '/products/dukan-erp', indexable: true },
  { id: 'contact', path: '/contact', indexable: true },
  { id: 'support', path: '/support', indexable: true },
  { id: 'privacy', path: '/privacy', indexable: true },
  { id: 'terms', path: '/terms', indexable: true },
  { id: 'accountDeletion', path: '/account-deletion', indexable: true },
  { id: 'privacyChoices', path: '/privacy-choices', indexable: true },
  { id: 'legalNotice', path: '/legal', indexable: true },
  { id: 'security', path: '/security', indexable: true },
  { id: 'apply', path: '/apply', indexable: true },
  // A status that needs signing in, and the sign-in itself: reachable, never indexed (the brief).
  { id: 'applicationStatus', path: '/application-status', indexable: false },
  { id: 'login', path: '/login', indexable: false },
];

/** The areas behind a sign-in: never prerendered, never indexed. */
export const PROTECTED_PREFIXES = ['/account', '/admin'] as const;

/**
 * Where the free trial's setup link lands (2026-10-13): inside the account area, so with no language prefix — the
 * setup message names this one address in every language.
 */
export const TRIAL_LANDING = '/account/trial';

export const LANGUAGE_PREFIX: Record<Language, string> = { en: '', fr: '/fr', ar: '/ar' };

export function routeById(id: PublicRouteId): PublicRoute {
  return PUBLIC_ROUTES.find((r) => r.id === id)!;
}

/** The path of a page in a language: `/about` → `/fr/about`; the French home is `/fr`. */
export function localizedPath(lang: Language, path: string): string {
  const prefix = LANGUAGE_PREFIX[lang];
  if (!prefix) return path;
  return path === '/' ? prefix : `${prefix}${path}`;
}

export function pathOf(id: PublicRouteId, lang: Language): string {
  return localizedPath(lang, routeById(id).path);
}

/** A pathname read back: its language prefix (English when none) and the path without it. */
export function splitLanguage(pathname: string): { lang: Language; path: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  for (const lang of ['fr', 'ar'] as const) {
    const prefix = LANGUAGE_PREFIX[lang];
    if (clean === prefix) return { lang, path: '/' };
    if (clean.startsWith(`${prefix}/`)) return { lang, path: clean.slice(prefix.length) };
  }
  return { lang: 'en', path: clean };
}

export function isProtectedPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PROTECTED_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`));
}

/** The public route a pathname shows, or null (protected or unknown). */
export function publicRouteAt(pathname: string): { route: PublicRoute; lang: Language } | null {
  if (isProtectedPath(pathname)) return null;
  const { lang, path } = splitLanguage(pathname);
  const route = PUBLIC_ROUTES.find((r) => r.path === path);
  return route ? { route, lang } : null;
}

/**
 * The legal and support pages as the mobile app opens them (the owner's brief of 2026-10-16): the same texts at
 * `/in-app/<page>` (and `/fr/in-app/…`, `/ar/in-app/…`), framed without the site's navigation, sign-in, product or
 * pricing links, so a link from the app can never become a way to buy. Never indexed; each names its public page as
 * canonical. Their links stay among these pages.
 */
export const IN_APP_PREFIX = '/in-app';
export const IN_APP_ROUTE_IDS: readonly PublicRouteId[] = ['privacy', 'privacyChoices', 'terms', 'accountDeletion', 'support', 'security', 'legalNotice'];

export function inAppPathOf(id: PublicRouteId, lang: Language): string {
  return localizedPath(lang, `${IN_APP_PREFIX}${routeById(id).path}`);
}

/** The in-app legal page a pathname shows, or null. */
export function inAppRouteAt(pathname: string): { route: PublicRoute; lang: Language } | null {
  const { lang, path } = splitLanguage(pathname);
  if (!path.startsWith(`${IN_APP_PREFIX}/`)) return null;
  const rest = path.slice(IN_APP_PREFIX.length);
  const route = PUBLIC_ROUTES.find((r) => r.path === rest && IN_APP_ROUTE_IDS.includes(r.id));
  return route ? { route, lang } : null;
}
