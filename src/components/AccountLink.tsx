import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../config/site';
import type { Language } from '../i18n/languages';
import { pathOf, PORTAL_HOME, type PublicRouteId } from '../site/routes';

/** The public pages that lead into the business account (and need its API). */
export type AccountPageId = 'apply' | 'login' | 'applicationStatus';

/**
 * Where a link into the business account goes (docs/95, docs/101): on this origin in a full build; in a public build,
 * the sign-in leads to the Dukan ERP portal's Owner page once TSX-MR has given the portal's origin
 * (`VITE_PORTAL_ORIGIN`), and nothing else leads there — the portal has no application or status page. Nowhere before
 * that: a public page never offers something its origin cannot do.
 */
export function accountHref(id: AccountPageId, lang: Language, site: Pick<typeof SITE, 'siteSurface' | 'portalOrigin'> = SITE): { to: string } | { href: string } | null {
  if (site.siteSurface !== 'public') return { to: pathOf(id, lang) };
  return id === 'login' && site.portalOrigin ? { href: `${site.portalOrigin}${PORTAL_HOME}` } : null;
}

export function AccountLink({ id, lang, className, children }: { id: AccountPageId; lang: Language; className?: string; children: ReactNode }) {
  const target = accountHref(id, lang);
  if (!target) return null;
  return 'to' in target ? (
    <Link className={className} to={target.to}>
      {children}
    </Link>
  ) : (
    <a className={className} href={target.href}>
      {children}
    </a>
  );
}

/** Whether a footer or menu entry for this page can be shown in this build. */
export function linkable(id: PublicRouteId, lang: Language): boolean {
  return id !== 'apply' && id !== 'login' && id !== 'applicationStatus' ? true : accountHref(id, lang) !== null;
}
