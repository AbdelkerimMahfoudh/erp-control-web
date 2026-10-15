import type { TimelineEvent } from '../api/types';
import { useI18n, type Key } from '../i18n';
import { formatDateTime, formatInstant } from '../lib/format';
import { Empty, Phrase } from './ui';

/** Every kind of event the server records on a subscription's history (its `SubscriptionEventKind`, 0095 included). */
const EVENT_KINDS = [
  'created',
  'extended',
  'branches_changed',
  'seats_changed',
  'complimentary_granted',
  'complimentary_revoked',
  'backfilled',
  'registered',
  'administrative_grant',
  'suspended',
  'reinstated',
  'cancelled',
  'approved',
  'rejected',
  'period_corrected',
  'seat_requested',
  'seat_paid',
  'staff_activated',
  'seat_closed',
  'store_requested',
  'activity_requested',
  'activity_changed',
  'activity_scheduled',
  'renewed',
  'trial_eligible',
  'trial_claimed',
  'trial_expired',
] as const;
type EventKind = (typeof EVENT_KINDS)[number];

/** A kind in words: each has its own; one this site does not know yet (a newer API) is a change recorded. */
function kindWords(kind: string): Key {
  return (EVENT_KINDS as readonly string[]).includes(kind) ? `event.${kind as EventKind}` : 'event.unknown';
}

/** The free trial's own events: told from the trial's facts, never from the server's note. */
const TRIAL_KINDS: ReadonlySet<string> = new Set<EventKind>(['trial_eligible', 'trial_claimed', 'trial_expired']);

/** The trial's facts the page already holds: the business's zone, and the recorded start and end once claimed. */
export interface TimelineTrial {
  timeZone: string;
  startedAt: string | null;
  endsAt: string | null;
}

/**
 * A subscription's history, one way for the account page and the console: each event's kind in words, then its note.
 * The free trial's events (2026-10-13) are told from catalogue sentences, their dates the server's UTC instants shown
 * in the business's zone with the zone's name — the server's own note, in English with raw instants, is never shown
 * for them. Every other kind keeps the note the server wrote. A business that never claimed has no trial view once its
 * chance to claim closed: the console still holds its zone with the trial's recorded facts, and the account page has
 * it from the business itself (C18). A page given no zone — an API older than both — dates the trial's eligibility as it
 * dates every other row.
 */
export function Timeline({ events, trial, actors = false }: { events: TimelineEvent[]; trial: TimelineTrial | null; actors?: boolean }) {
  const { t, lang } = useI18n();
  if (events.length === 0) return <Empty />;
  return (
    <ul className="timeline">
      {events.map((e) => (
        <li key={e.id}>
          <span className="dot" aria-hidden="true" />
          <div>
            <div>
              <strong>{t(kindWords(e.kind))}</strong>
              <EventNote event={e} trial={trial} />
              {actors && e.actor ? (
                <>
                  {' '}
                  <span className="muted small ltr">({e.actor})</span>
                </>
              ) : null}
            </div>
            <time dateTime={e.createdAt}>{TRIAL_KINDS.has(e.kind) && trial ? formatInstant(e.createdAt, trial.timeZone, lang) : formatDateTime(e.createdAt, lang)}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** What follows the kind: the trial's sentence with its recorded dates, or the server's note for every other kind. */
function EventNote({ event, trial }: { event: TimelineEvent; trial: TimelineTrial | null }) {
  const { t, lang } = useI18n();
  const at = (iso: string) => formatInstant(iso, trial?.timeZone, lang);
  switch (event.kind) {
    case 'trial_eligible':
      return <> — {t('event.trial_eligible.note')}</>;
    case 'trial_claimed':
      return trial?.startedAt && trial.endsAt ? (
        <>
          {' — '}
          <Phrase text={t('event.trial_claimed.note')} values={{ start: at(trial.startedAt), end: at(trial.endsAt) }} />
        </>
      ) : (
        <> — {t('event.trial_claimed.note.undated')}</>
      );
    case 'trial_expired':
      return trial?.endsAt ? (
        <>
          {' — '}
          <Phrase text={t('event.trial_expired.note')} values={{ end: at(trial.endsAt) }} />
        </>
      ) : (
        <> — {t('event.trial_expired.note.undated')}</>
      );
    default:
      // The server writes its notes in English: isolated, so an Arabic line does not turn their punctuation around.
      return event.note ? (
        <>
          {' — '}
          <bdi>{event.note}</bdi>
        </>
      ) : null;
  }
}
