import type { SeatRequest } from '../api/types';
import { useI18n, type Key } from '../i18n';
import { isScheduledActivityChange } from '../lib/activity';
import { formatInstant, formatMru } from '../lib/format';
import { Badge, Phrase, RequestBadge } from './ui';

/**
 * One seat, store or activity request in words, as the server described it —
 * the same sentence on the Owner's page and in the platform's queue.
 */
export function RequestSummary({ request: r }: { request: SeatRequest }) {
  const { t } = useI18n();
  const name = (a: string) => t(`activity.${a}` as Key);
  if (r.kind === 'activity') {
    const store = r.branchName ?? r.store?.name ?? '—';
    return (
      <>
        {t('account.requests.activity')} {t('account.requests.at', { store })}
        {r.activityFrom && r.activityTo ? (
          <>
            {': '}
            <strong>{t('account.requests.change', { from: name(r.activityFrom), to: name(r.activityTo) })}</strong>
          </>
        ) : null}
        {r.activityEffective ? <span className="muted small"> · {t(`account.requests.effective.${r.activityEffective}` as Key)}</span> : null}
      </>
    );
  }
  return (
    <>
      {r.kind === 'seat' ? t('account.requests.seat') : t('account.requests.store')}{' '}
      {r.kind === 'seat' && r.store ? t('account.requests.at', { store: r.store.name }) : r.label ? `“${r.label}”` : ''}{' '}
      {r.kind === 'store' && r.activityTo ? <span className="muted small">· {name(r.activityTo)} </span> : null}
      {r.person ? t('account.requests.for', { person: r.person.name }) : ''}
    </>
  );
}

/**
 * The request's amount, read as the server means it: a seat or a store per
 * month; an activity change the difference for this month once it is paid, or
 * nothing at all when it waits for the renewal; a store that replaces one closed
 * this paid month the difference it pays now, never a monthly price (D158).
 */
export function RequestAmount({ request: r }: { request: SeatRequest }) {
  const { t, lang } = useI18n();
  const amount = formatMru(r.monthlyAmount, lang);
  if (r.kind === 'activity') {
    if (r.activityEffective === 'renewal') return <>{t('account.requests.activityRenewal')}</>;
    return <>{t('account.requests.activityNow', { amount })}</>;
  }
  if (r.kind === 'store' && r.replaces) {
    return (
      <>
        {r.monthlyAmount === 0
          ? t('account.requests.replacementFree', { store: r.replaces.name })
          : t('account.requests.replacementNow', { amount, store: r.replaces.name })}
      </>
    );
  }
  return <>{t('account.requests.perMonth', { amount })}</>;
}

/**
 * The status in words and colour; a change waiting for the renewal says so rather than "Granted". A store or seat paid
 * for during a free trial is "Paid · scheduled", with when it starts (D176).
 */
export function RequestStatus({ request: r }: { request: SeatRequest }) {
  const { t } = useI18n();
  if (isScheduledActivityChange(r)) return <Badge tone="info">{t('account.requests.status.scheduled')}</Badge>;
  if (r.status === 'scheduled') {
    return (
      <span className="stack-tight">
        <span>
          <RequestBadge status={r.status} />
        </span>
        <ScheduledStart request={r} />
      </span>
    );
  }
  return <RequestBadge status={r.status} />;
}

/**
 * When a scheduled store or seat starts, as the server computed it (D176): when the trial ends, at the instant its
 * claim recorded — told in the row's own zone, the business's, with the zone's name, isolated — or, while no paid access
 * is approved for then, with the first paid month. The same sentence on the Owner's page and in the platform's queue,
 * where each row carries its own business's zone. Nothing here works a date out.
 */
function ScheduledStart({ request: r }: { request: SeatRequest }) {
  const { t, lang } = useI18n();
  const activation = r.activation;
  if (!activation) return null;
  if (activation.waitsFor === 'paid_access') return <span className="small">{t('trial.addons.waitsForPaidAccess')}</span>;
  return (
    <span className="small">
      <Phrase
        text={t(r.kind === 'store' ? 'trial.addons.storeAtEnd' : 'trial.addons.seatAtEnd')}
        values={{ date: formatInstant(activation.startsAt, activation.timeZone, lang) }}
      />
    </span>
  );
}
