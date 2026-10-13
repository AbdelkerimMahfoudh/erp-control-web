import type { BusinessDetail } from '../../api/types';
import { Notice, Phrase } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatInstant } from '../../lib/format';

/**
 * A business's free trial as the server recorded it (2026-10-13), for the console: the eligibility written when the
 * business registered itself — how, since when, and when and why it closed — and the claim, immutable, with its exact
 * start and end and when its end was recorded. Every date in the business's own zone. Nothing on the business page
 * creates, extends or shortens a trial: no decision touches one, and paid access or a grant approved while a trial
 * runs starts when it ends — the server sets it so.
 */
export function BusinessTrial({ business }: { business: BusinessDetail }) {
  const { t, lang } = useI18n();
  // An API older than the trial says nothing about it, and neither does this card.
  if (business.trial === undefined) return null;
  const eligibility = business.trial?.eligibility ?? null;
  const claim = business.trial?.claim ?? null;
  const zone = business.trial?.timeZone ?? business.entitlement?.trial?.timeZone ?? null;
  const at = (iso: string | null) => formatInstant(iso, zone, lang);

  if (!eligibility && !claim) {
    return (
      <section className="card stack">
        <h2>{t('admin.trial.title')}</h2>
        <p className="muted">{t('admin.trial.none')}</p>
      </section>
    );
  }
  return (
    <section className="card stack">
      <h2>{t('admin.trial.title')}</h2>
      {eligibility ? (
        <div className="stack-tight">
          <p>
            <Phrase text={t('admin.trial.eligible')} values={{ date: at(eligibility.createdAt), method: t(`admin.trial.method.${eligibility.registrationMethod}` as Key) }} />
          </p>
          {eligibility.closedAt ? (
            <p>
              <Phrase
                text={t('admin.trial.closed')}
                values={{ date: at(eligibility.closedAt), reason: eligibility.closedReason ? t(`admin.trial.reason.${eligibility.closedReason}` as Key) : '—' }}
              />
            </p>
          ) : (
            <p>{t('admin.trial.open')}</p>
          )}
        </div>
      ) : null}
      {claim ? (
        <div className="stack-tight">
          <p>
            <Phrase text={t('admin.trial.claimed')} values={{ date: at(claim.claimedAt) }} />
          </p>
          <p>
            <strong>
              <Phrase text={t('admin.trial.runs')} values={{ start: at(claim.startedAt), end: at(claim.endsAt) }} />
            </strong>
          </p>
          <p className="muted small">
            {claim.expiryRecordedAt ? <Phrase text={t('admin.trial.expiryRecorded')} values={{ date: at(claim.expiryRecordedAt) }} /> : t('admin.trial.expiryPending')}
          </p>
        </div>
      ) : (
        <p className="muted">{t('admin.trial.notClaimed')}</p>
      )}
      <Notice tone="info">
        {claim ? `${t('admin.trial.paidAfter')} ` : ''}
        {t('admin.trial.noAction')}
      </Notice>
    </section>
  );
}
