import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { applyNotFoundHead } from '../../site/head';
import { PORTAL_HOME } from '../../site/routes';

/**
 * The portal's "Page not found" (docs/101): an address the portal does not know, in the reader's language. Nothing from
 * the address is shown back; the one way on is the Owner's page.
 */
export function PortalNotFound() {
  const { t } = useI18n();
  const title = t('notFound.title');
  useEffect(() => applyNotFoundHead(`${title} — Dukan ERP`), [title]);
  return (
    <div className="stack">
      <section className="hero">
        <p className="muted small">{t('notFound.eyebrow')}</p>
        <h1>{title}</h1>
        <p className="lead">{t('portal.notFound.body')}</p>
      </section>
      <div className="row">
        <Link className="btn btn-primary" to={PORTAL_HOME}>
          {t('portal.notFound.home')}
        </Link>
      </div>
    </div>
  );
}
