import { useI18n } from '../../i18n';

const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || '';
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.trim() || '';

export function Privacy() {
  const { t } = useI18n();
  return (
    <article className="card stack">
      <h1>{t('privacy.title')}</h1>
      <p>{t('privacy.body1')}</p>
      <p>{t('privacy.body2')}</p>
      <p>{t('privacy.body3')}</p>
      <p>{t('privacy.body4')}</p>
      <p className="muted">{t('privacy.contact')}</p>
    </article>
  );
}

export function Terms() {
  const { t } = useI18n();
  return (
    <article className="card stack">
      <h1>{t('terms.title')}</h1>
      <p>{t('terms.body1')}</p>
      <p>{t('terms.body2')}</p>
      <p>{t('terms.body3')}</p>
      <p>{t('terms.body4')}</p>
    </article>
  );
}

export function Support() {
  const { t } = useI18n();
  const configured = SUPPORT_EMAIL || SUPPORT_WHATSAPP;
  return (
    <article className="card stack">
      <h1>{t('support.title')}</h1>
      <p>{t('support.body')}</p>
      {configured ? (
        <ul>
          {SUPPORT_EMAIL ? (
            <li>
              {t('support.email')}: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </li>
          ) : null}
          {SUPPORT_WHATSAPP ? (
            <li>
              {t('support.whatsapp')}: <span className="ltr">{SUPPORT_WHATSAPP}</span>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="notice tone-warn">{t('support.none')}</p>
      )}
      <p className="muted">{t('support.status')}</p>
    </article>
  );
}

export function AccountDeletion() {
  const { t } = useI18n();
  return (
    <article className="card stack">
      <h1>{t('deletion.title')}</h1>
      <p>{t('deletion.body1')}</p>
      <p>{t('deletion.body2')}</p>
      <p>{t('deletion.body3')}</p>
      <p>{t('deletion.body4')}</p>
    </article>
  );
}
