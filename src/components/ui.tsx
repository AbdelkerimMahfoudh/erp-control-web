import { Fragment, isValidElement, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import type { EntitlementState, SeatRequestStatus } from '../api/types';
import { useI18n, type Key } from '../i18n';
import { formatDate, formatInstant, formatMru } from '../lib/format';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'muted';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

const STATE_TONE: Record<EntitlementState, Tone> = {
  pending: 'info',
  active: 'ok',
  grace: 'warn',
  expired: 'danger',
  complimentary: 'ok',
  suspended: 'danger',
  cancelled: 'muted',
  rejected: 'danger',
  // Not started is waiting, like pending; a running trial works; an ended one is read-only, like expired.
  trial_available: 'info',
  trial_active: 'ok',
  trial_expired: 'danger',
};

/**
 * A catalogue sentence whose values keep their own direction (docs/74 §4): each `{name}` given as text is set in a
 * `<bdi>`, so a date or a time zone reads in its own order inside an Arabic sentence, and the sentence keeps its own
 * order around it. A value given as markup is set as it is and isolates its own parts — a list of masked addresses
 * joined by the sentence's own "and" must flow with the sentence, each address alone kept left to right; inside one
 * `<bdi>` the first address would turn the Arabic "and" around. `text` is `t(key)` called without values.
 */
export function Phrase({ text, values }: { text: string; values: Record<string, ReactNode> }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    if (m.index > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
    const value = values[m[1]!] ?? m[0];
    parts.push(isValidElement(value) ? <Fragment key={`v${m.index}`}>{value}</Fragment> : <bdi key={`v${m.index}`}>{value}</bdi>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

/**
 * A catalogue sentence dated with server instants — a paid period's or a grant's end. Given the business's zone, each
 * date is told as a trial's is: in that zone, with the zone's name, isolated. A business with a free trial is given
 * it, since access decided during the trial runs from the trial's end (2026-10-13). Without a zone, each date is told
 * as every other date on the page.
 */
export function DatedPhrase({ phrase, dates, timeZone }: { phrase: Key; dates: Record<string, string | null>; timeZone: string | null | undefined }) {
  const { t, lang } = useI18n();
  const each = (format: (iso: string | null) => string) => Object.fromEntries(Object.entries(dates).map(([name, iso]) => [name, format(iso)]));
  if (timeZone) return <Phrase text={t(phrase)} values={each((iso) => formatInstant(iso, timeZone, lang))} />;
  return <>{t(phrase, each((iso) => formatDate(iso, lang)))}</>;
}

/** Status by colour AND words, never colour alone. */
export function StateBadge({ state }: { state: EntitlementState | string | null | undefined }) {
  const { t } = useI18n();
  const known = state && state in STATE_TONE ? (state as EntitlementState) : null;
  return <Badge tone={known ? STATE_TONE[known] : 'muted'}>{known ? t(`status.${known}` as Key) : t('status.unknown')}</Badge>;
}

const REQUEST_TONE: Record<SeatRequestStatus, Tone> = {
  pending_payment: 'warn',
  paid: 'ok',
  granted: 'ok',
  released: 'muted',
  refused: 'danger',
  // Paid, and waiting to start (D176): neither in force nor owed.
  scheduled: 'info',
};

/**
 * A request's status in words. A store or seat paid for during a free trial reads "Paid · scheduled" (D176) — never
 * `account.requests.status.scheduled`, which is an activity change's "Scheduled for the renewal".
 */
export function requestStatusKey(status: SeatRequestStatus): Key {
  return status === 'scheduled' ? 'account.requests.status.paidScheduled' : (`account.requests.status.${status}` as Key);
}

export function RequestBadge({ status }: { status: SeatRequestStatus }) {
  const { t } = useI18n();
  return <Badge tone={REQUEST_TONE[status]}>{t(requestStatusKey(status))}</Badge>;
}

/** A server amount, formatted. This component never multiplies anything. */
export function Money({ amount }: { amount: number | string }) {
  const { lang } = useI18n();
  return (
    <span className="money ltr" dir="ltr">
      {formatMru(amount, lang)}
    </span>
  );
}

export function Notice({ tone, title, children }: { tone: Tone; title?: string; children?: ReactNode }) {
  return (
    <div className={`notice tone-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {title ? <strong>{title}</strong> : null}
      {title && children ? <br /> : null}
      {children}
    </div>
  );
}

export function errorKey(e: unknown): Key {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'error.network';
    if (e.status === 401) return 'error.unauthorized';
    if (e.status === 403) return 'error.forbidden';
    if (e.status === 409) return 'error.conflict';
    // The API's rate limit refuses with no code and its class name for a sentence ("ThrottlerException: Too Many
    // Requests"); every limit it sets counts one minute. A refusal of its own, with a code, keeps the server's words.
    if (e.status === 429 && e.code === null) return 'error.tooManyRequests';
  }
  return 'error.generic';
}

/** The server's own sentence when it sent one, else the generic one. */
export function ErrorNotice({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  const key = errorKey(error);
  const detail = key !== 'error.tooManyRequests' && error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 ? error.message : null;
  return (
    <Notice tone="danger" title={t(key)}>
      {detail && detail !== t(key) ? detail : null}
    </Notice>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <p className="muted" role="status">
      {t('state.loading')}
    </p>
  );
}

export function Empty({ text }: { text?: string }) {
  const { t } = useI18n();
  return <p className="muted">{text ?? t('state.empty')}</p>;
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      {label}
      {hint ? <span className="hint">{hint}</span> : null}
      {children}
    </label>
  );
}

/**
 * A table whose cells carry their heading, so it becomes labelled cards below 720px. Wider than its card above that, it
 * scrolls inside the card, never running under the card beside it.
 */
export function Table<T>({ columns, rows, keyOf }: { columns: { label: string; render: (row: T) => ReactNode }[]; rows: T[]; keyOf: (row: T) => string }) {
  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)}>
              {columns.map((c) => (
                <td key={c.label} data-label={c.label}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
