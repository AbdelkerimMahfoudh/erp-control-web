import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { applyNotFoundHead } from '../../site/head';

/** An address the console's own site does not know: nothing from the address is shown back; the one way on is the console. */
export function AdminNotFound() {
  const { t } = useI18n();
  const title = t('notFound.title');
  useEffect(() => applyNotFoundHead(`${title} — Dukan ERP`), [title]);
  return (
    <div className="stack">
      <section className="hero">
        <p className="muted small">{t('notFound.eyebrow')}</p>
        <h1>{title}</h1>
      </section>
      <div className="row">
        <Link className="btn btn-primary" to="/admin">
          {t('portal.home.admin')}
        </Link>
      </div>
    </div>
  );
}
