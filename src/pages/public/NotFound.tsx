import { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../../config/site';
import { InAppContext } from '../../components/public/blocks';
import { Icon } from '../../components/public/icons';
import { useI18n } from '../../i18n';
import { applyNotFoundHead } from '../../site/head';
import { inAppPathOf, pathOf, type PublicRouteId } from '../../site/routes';

/** Where a lost reader most likely meant to go: the product, the help, and the two texts asked for most. */
const SUGGESTED: PublicRouteId[] = ['dukanErp', 'support', 'privacy', 'terms'];

/**
 * The page for an address that leads nowhere (the owner's brief of 2026-10-17). The host answers such an address with
 * a 404 status and the nearest prerendered `404.html` (`scripts/prerender.mjs`: one per language, and one per language
 * for the app's pages); when the router is the one that finds nothing, after a link inside the site, it shows this same
 * page. Nothing from the address is shown back: the page says the same thing whatever was asked for.
 *
 * Inside the pages the mobile app opens it keeps their frame — the help and legal pages only, no home, product or
 * contact link — so a mistyped address in the app never leads out of them.
 */
export function NotFound() {
  const { t, lang } = useI18n();
  const inApp = useContext(InAppContext);
  const title = t('notFound.title');
  useEffect(() => applyNotFoundHead(`${title} — ${SITE.displayName}`), [title]);
  const to = (id: PublicRouteId) => pathOf(id, lang);
  const labels: Record<string, string> = {
    dukanErp: t('nav.dukanErp'),
    support: t('nav.support'),
    privacy: t('footer.privacy'),
    terms: t('footer.terms'),
  };
  return (
    <div className="public-page not-found">
      <section className="band band-dark nf-hero" aria-labelledby="nf-h">
        <div className="container nf-grid">
          <div className="nf-copy">
            <p className="nf-eyebrow">{t('notFound.eyebrow')}</p>
            <h1 id="nf-h">{title}</h1>
            <p className="lead">{t(inApp ? 'notFound.inApp.body' : 'notFound.body', { name: SITE.displayName })}</p>
            <div className="hero-actions">
              {inApp ? (
                <Link className="btn btn-primary btn-lg" to={inAppPathOf('support', lang)}>
                  <span>{t('notFound.inApp.support')}</span>
                  <Icon name="arrow" size={18} className="icon-arrow" />
                </Link>
              ) : (
                <>
                  <Link className="btn btn-primary btn-lg" to={to('home')}>
                    <span>{t('notFound.home')}</span>
                    <Icon name="arrow" size={18} className="icon-arrow" />
                  </Link>
                  <Link className="btn btn-ghost btn-lg" to={to('contact')}>
                    {t('notFound.contact')}
                  </Link>
                </>
              )}
            </div>
          </div>
          <NotFoundMark />
        </div>
      </section>
      {inApp ? null : (
        <section className="band band-light nf-more" aria-labelledby="nf-more-h">
          <div className="container">
            <h2 id="nf-more-h" className="nf-more-title">
              {t('notFound.suggestions')}
            </h2>
            <ul className="legal-links nf-links">
              {SUGGESTED.map((id) => (
                <li key={id}>
                  <Link className="related-link" to={to(id)}>
                    {labels[id]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * The 404, set as a figure: two fours around a ring with one amber point on it — the address the reader asked for,
 * not on the map. Drawn inline (no image, no font of its own), the same in every language and both directions, and
 * hidden from assistive technology: the heading says it in words.
 */
function NotFoundMark() {
  return (
    <div className="nf-mark" aria-hidden="true" dir="ltr">
      <span className="nf-digit">4</span>
      <svg className="nf-ring" viewBox="0 0 120 120" focusable="false">
        <defs>
          <linearGradient id="nf-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="nf-stop-a" />
            <stop offset="1" className="nf-stop-b" />
          </linearGradient>
        </defs>
        <circle className="nf-ring-track" cx="60" cy="60" r="46" />
        <circle className="nf-ring-arc" cx="60" cy="60" r="46" stroke="url(#nf-ring-gradient)" />
        <circle className="nf-ring-halo" cx="92.5" cy="27.5" r="15" />
        <circle className="nf-ring-point" cx="92.5" cy="27.5" r="8" />
      </svg>
      <span className="nf-digit">4</span>
    </div>
  );
}
