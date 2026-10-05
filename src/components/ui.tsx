import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import type { EntitlementState, SeatRequestStatus } from '../api/types';
import { useI18n, type Key } from '../i18n';
import { formatMru } from '../lib/format';

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
};

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
};

export function RequestBadge({ status }: { status: SeatRequestStatus }) {
  const { t } = useI18n();
  return <Badge tone={REQUEST_TONE[status]}>{t(`account.requests.status.${status}` as Key)}</Badge>;
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
  }
  return 'error.generic';
}

/** The server's own sentence when it sent one, else the generic one. */
export function ErrorNotice({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  const key = errorKey(error);
  const detail = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 ? error.message : null;
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

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      {label}
      {hint ? <span className="hint">{hint}</span> : null}
      {children}
    </label>
  );
}

/** A table whose cells carry their heading, so it becomes labelled cards below 720px. */
export function Table<T>({ columns, rows, keyOf }: { columns: { label: string; render: (row: T) => ReactNode }[]; rows: T[]; keyOf: (row: T) => string }) {
  return (
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
  );
}
