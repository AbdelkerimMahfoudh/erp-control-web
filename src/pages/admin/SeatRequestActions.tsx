import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import type { SeatActivation, SeatRequest } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { ErrorNotice, Field, Notice, Phrase } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { isScheduledActivityChange } from '../../lib/activity';
import { formatInstant } from '../../lib/format';

/**
 * The answer to a confirmation: the row as it now stands — `allocation.activation` is when a store or seat paid for
 * during a free trial starts (D176) — and `activation`, whether the seat's person could be activated (another thing).
 */
interface ConfirmResult {
  applied: boolean;
  allocation: SeatRequest;
  activation: { activated: boolean; pending: string[] } | null;
}

/**
 * When a store or seat whose payment was just confirmed during a free trial starts (D176): when the business's trial
 * ends — the server's instant, in the row's own zone — or with its first paid month, while no paid access is approved
 * for then. Either way nothing is in force or charged to a period before, and this payment is its first month's.
 */
function ScheduledConfirmation({ activation }: { activation: SeatActivation }) {
  const { t, lang } = useI18n();
  if (activation.waitsFor === 'paid_access') return <>{t('admin.trial.addonWaits')}</>;
  return <Phrase text={t('admin.trial.addonScheduled')} values={{ date: formatInstant(activation.startsAt, activation.timeZone, lang) }} />;
}

/**
 * A confirmation the server refused, in words. `paid_period_not_started` (D176): a business with free trial facts, no
 * paid period ever started and no trial running — a payment recorded now would be charged again by its first paid
 * period, so nothing was recorded and the request still awaits payment; it is not something to "try again".
 */
function ConfirmRefusal({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (error instanceof ApiError && error.code === 'reference_required') return <Notice tone="danger">{t('admin.action.reference.required')}</Notice>;
  if (error instanceof ApiError && error.code === 'paid_period_not_started') {
    return (
      <Notice tone="danger" title={t('admin.trial.paidPeriodNotStarted.title')}>
        {t('admin.trial.paidPeriodNotStarted.refused')}
      </Notice>
    );
  }
  return <ErrorNotice error={error} />;
}

/**
 * Confirm, refuse or release one seat/store/activity request. Confirming needs
 * a reference and the administrator's password; the server prices nothing from
 * what is typed here — the amount is what was actually paid, recorded as
 * evidence beside the reference.
 *
 * An activity upgrade is confirmed like a seat (the branch changes at once);
 * refusing leaves the branch as it is; only a change still waiting for the
 * renewal can be released — the server refuses to release one in force.
 *
 * What a confirmation did is read from the row the server answered with, never
 * assumed from the request: a store is "opened" only when it is paid; a store or
 * seat paid for during a free trial is scheduled (D176) — nothing opens, and the
 * outcome says when it starts. A scheduled row offers no action at all: it can be
 * neither confirmed again, refused nor released.
 *
 * `onOutcome` hands the result to the page before the list is reloaded: a
 * decided request usually leaves the list it was in ("Awaiting payment"), and
 * its row — with any message drawn inside it — goes with it.
 */
export function SeatRequestActions({
  companyId,
  request,
  ask,
  onDone,
  onOutcome,
}: {
  companyId: string;
  request: SeatRequest;
  ask: () => Promise<string | null>;
  onDone: () => Promise<void>;
  onOutcome?: (lines: ReactNode[]) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'none' | 'confirm' | 'refuse' | 'release'>('none');
  const [amount, setAmount] = useState(String(request.monthlyAmount));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState<'manual' | 'bank_transfer' | 'mobile_money'>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [outcome, setOutcome] = useState<ReactNode[] | null>(null);
  // Shown once: by the page when it keeps the result, otherwise in this row.
  const report = (lines: ReactNode[]) => (onOutcome ? onOutcome(lines) : setOutcome(lines));

  const base = `platform/businesses/${companyId}/seat-requests/${request.id}`;
  const releasable = (request.kind === 'seat' && (request.status === 'paid' || request.status === 'granted')) || isScheduledActivityChange(request);
  const releaseLabel = request.kind === 'activity' ? t('admin.seats.release.change') : t('admin.seats.release');

  const run = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      if (mode === 'confirm') {
        const r = await adminRequest<ConfirmResult>(`${base}/confirm-payment`, {
          method: 'POST',
          body: { amount, paidAt: new Date(paidAt).toISOString(), channel, reference: reference.trim(), note: note.trim() || undefined, expectedVersion: request.version, confirmPassword },
        });
        const now = r.allocation;
        const lines: ReactNode[] = [r.applied ? t('admin.seats.confirmed', { reference: reference.trim() }) : t('admin.action.noop')];
        if (r.applied && now.status === 'scheduled' && now.activation) lines.push(<ScheduledConfirmation activation={now.activation} />);
        if (r.applied && now.status === 'paid' && now.kind === 'store') lines.push(t('admin.seats.storeOpened'));
        if (r.applied && now.status === 'paid' && now.kind === 'activity') lines.push(t('admin.seats.activityChanged'));
        if (r.activation) {
          lines.push(
            r.activation.activated
              ? t('admin.seats.activated')
              : t('admin.seats.stillPending', { reasons: r.activation.pending.map((p) => t(`pending.${p}` as Key)).join(', ') }),
          );
        }
        report(lines);
      } else {
        const r = await adminRequest<{ applied: boolean }>(`${base}/${mode === 'refuse' ? 'refuse' : 'release'}`, {
          method: 'POST',
          body: { reason: reason.trim(), expectedVersion: request.version, confirmPassword },
        });
        report([r.applied ? t('admin.action.applied') : t('admin.action.noop')]);
      }
      setMode('none');
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (outcome) {
    return (
      <Notice tone="ok">
        {outcome.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </Notice>
    );
  }

  if (mode === 'none') {
    return (
      <div className="row">
        {request.status === 'pending_payment' ? (
          <>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setMode('confirm')}>
              {t('admin.seats.confirm')}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setMode('refuse')}>
              {t('admin.seats.refuse')}
            </button>
          </>
        ) : null}
        {releasable ? (
          <button type="button" className="btn btn-sm" onClick={() => setMode('release')}>
            {releaseLabel}
          </button>
        ) : null}
        <ErrorNotice error={error} />
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={run}>
      {mode === 'confirm' ? (
        <>
          <h3>{t('admin.seats.confirm')}</h3>
          <div className="grid">
            <Field label={t('admin.action.amount')}>
              <input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('admin.action.paidAt')}>
              <input required type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </Field>
            <Field label={t('admin.action.channel')}>
              <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
                <option value="bank_transfer">{t('admin.action.channel.bank_transfer')}</option>
                <option value="mobile_money">{t('admin.action.channel.mobile_money')}</option>
                <option value="manual">{t('admin.action.channel.manual')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('admin.action.reference')} hint={t('admin.action.reference.required')}>
            <input required minLength={3} maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('admin.action.note')}>
            <textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      ) : (
        <>
          <h3>{mode === 'refuse' ? t('admin.seats.refuse') : releaseLabel}</h3>
          <Field label={t('admin.action.reason')} hint={t('admin.action.reason.required')}>
            <input required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </>
      )}
      <ConfirmRefusal error={error} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || (mode === 'confirm' ? reference.trim().length < 3 : !reason.trim())}>
          {t('action.confirm')}
        </button>
        <button type="button" className="btn" onClick={() => setMode('none')}>
          {t('action.cancel')}
        </button>
      </div>
    </form>
  );
}
