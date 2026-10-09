import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { SeatRequest } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { ErrorNotice, Field, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { isScheduledActivityChange } from '../../lib/activity';

interface ConfirmResult {
  applied: boolean;
  allocation: SeatRequest;
  activation: { activated: boolean; pending: string[] } | null;
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
 */
export function SeatRequestActions({ companyId, request, ask, onDone }: { companyId: string; request: SeatRequest; ask: () => Promise<string | null>; onDone: () => Promise<void> }) {
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
  const [outcome, setOutcome] = useState<string[] | null>(null);

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
        const lines = [r.applied ? t('admin.seats.confirmed', { reference: reference.trim() }) : t('admin.action.noop')];
        if (request.kind === 'store' && r.applied) lines.push(t('admin.seats.storeOpened'));
        if (request.kind === 'activity' && r.applied) lines.push(t('admin.seats.activityChanged'));
        if (r.activation) {
          lines.push(
            r.activation.activated
              ? t('admin.seats.activated')
              : t('admin.seats.stillPending', { reasons: r.activation.pending.map((p) => t(`pending.${p}` as Key)).join(', ') }),
          );
        }
        setOutcome(lines);
      } else {
        const r = await adminRequest<{ applied: boolean }>(`${base}/${mode === 'refuse' ? 'refuse' : 'release'}`, {
          method: 'POST',
          body: { reason: reason.trim(), expectedVersion: request.version, confirmPassword },
        });
        setOutcome([r.applied ? t('admin.action.applied') : t('admin.action.noop')]);
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
        {outcome.map((l) => (
          <div key={l}>{l}</div>
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
      {error instanceof ApiError && error.code === 'reference_required' ? <Notice tone="danger">{t('admin.action.reference.required')}</Notice> : <ErrorNotice error={error} />}
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
