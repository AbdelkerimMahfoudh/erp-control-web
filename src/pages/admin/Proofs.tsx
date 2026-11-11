import { useCallback, useEffect, useState } from 'react';
import { ProofLines } from '../../components/stores';
import { Link } from 'react-router-dom';
import { apiBase } from '../../api/client';
import type { PaymentProof, ProofRecovery } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Empty, ErrorNotice, Field, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate } from '../../lib/format';
import { useStepUp } from './useStepUp';
import { ProofViewer, proofFileHref } from '../../components/ProofViewer';

/** Payment proofs waiting for a person (D227). An approval records what the administrator verified, not what was claimed. */
export function Proofs() {
  const { t } = useI18n();
  const { ask, dialog } = useStepUp();
  const [rows, setRows] = useState<PaymentProof[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminRequest<PaymentProof[]>('platform/payment-proofs'));
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => void load(), [load]);

  return (
    <div className="stack">
      {dialog}
      <h1>{t('admin.proofs.title')}</h1>
      <ErrorNotice error={error} />
      {rows?.length === 0 ? <Empty text={t('admin.proofs.none')} /> : null}
      {rows?.map((p) => <ProofRow key={p.id} proof={p} ask={ask} onDone={load} />)}
    </div>
  );
}

function ProofRow({ proof, ask, onDone }: { proof: PaymentProof; ask: () => Promise<boolean>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState({ amount: proof.amount, paidAt: proof.paidAt.slice(0, 10), months: String(proof.months ?? 1), channel: proof.months ? 'mobile_money' : 'manual', reason: '' });
  const [refusal, setRefusal] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const act = async (path: 'approve' | 'refuse', body: Record<string, unknown>) => {
    setError(null);
    if (!(await ask())) return;
    setBusy(true);
    try {
      // 0135: the decision names the revision shown here; one the Owner has corrected since is refused (proof_revised).
      await adminRequest(`platform/payment-proofs/${proof.id}/${path}`, { method: 'POST', body: { ...body, revision: proof.revision ?? 1 } });
      await onDone();
    } catch (e) {
      setError(e);
      // The Owner corrected it meanwhile: the latest version is read at once, with the error kept above it.
      if ((e as { code?: string } | null)?.code === 'proof_revised') await onDone().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack">
      <div className="row spread">
        <Link to={`/admin/businesses/${proof.companyId}`}>{t('admin.proofs.business')}</Link>
        <span>
          <Money amount={proof.amount} /> · {formatDate(proof.paidAt, lang)} · {t(`portal.proof.status.${proof.status}` as Key)}
        </span>
      </div>
      {proof.reference ? <p className="ltr">{proof.reference}</p> : null}
      {proof.payerPhone ? (
        <p>
          {t('admin.proofs.payer')}: <span className="ltr" dir="ltr">{proof.payerPhone}</span>
        </p>
      ) : null}
      {(proof.revision ?? 1) > 1 ? (
        <Notice tone="warn">{t('admin.proofs.revised', { revision: String(proof.revision), when: proof.revisedAt ? formatDate(proof.revisedAt, lang) : '' })}</Notice>
      ) : null}
      {proof.fileAvailable ? (
        // 0136: the proof itself, as the Owner last sent it (its revision), before any decision.
        <ProofViewer
          path={`platform/payment-proofs/${proof.id}/file`}
          revision={proof.revision ?? 1}
          fileName={proof.fileName ?? 'payment-proof'}
          downloadHref={proofFileHref(`platform/payment-proofs/${proof.id}/file`)}
        />
      ) : (
        <Notice tone="warn">{t('admin.proofs.purged')}</Notice>
      )}
      {proof.applying ? <Recovery proof={proof} ask={ask} onDone={onDone} /> : (
      <>
      <ProofLines lines={proof.lines} />
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void act('approve', { amount: form.amount.trim(), paidAt: new Date(form.paidAt).toISOString(), months: Number(form.months), channel: form.channel, reason: form.reason.trim() });
        }}
      >
        <div className="grid">
          <Field label={t('admin.access.amount')}>
            <input required inputMode="decimal" dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label={t('admin.access.paidAt')}>
            <input required type="date" dir="ltr" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
          </Field>
          <Field label={t('admin.proofs.months')}>
            <input required type="number" min={1} max={60} dir="ltr" value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} />
          </Field>
          <Field label={t('admin.action.channel')}>
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {['manual', 'bank_transfer', 'mobile_money'].map((c) => (
                <option key={c} value={c}>
                  {t(`admin.action.channel.${c}` as Key)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('admin.proofs.reason')}>
          <input required maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('admin.proofs.approve')}
        </button>
      </form>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void act('refuse', { reason: refusal.trim() });
        }}
      >
        <Field label={t('admin.proofs.refusal')}>
          <input required maxLength={500} value={refusal} onChange={(e) => setRefusal(e.target.value)} />
        </Field>
        <button type="submit" className="btn" disabled={busy}>
          {t('admin.proofs.refuse')}
        </button>
      </form>
      </>
      )}
      <ErrorNotice error={error} />
    </section>
  );
}

/** A stopped approval: what the records say happened, and only the actions that fit it. The stored decision is finished, never a new one. */
function Recovery({ proof, ask, onDone }: { proof: PaymentProof; ask: () => Promise<boolean>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<ProofRecovery | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await adminRequest<ProofRecovery>(`platform/payment-proofs/${proof.id}/recovery`));
    } catch (e) {
      setError(e);
    }
  }, [proof.id]);
  useEffect(() => void load(), [load]);

  const act = async (path: 'complete' | 'release', extra: Record<string, unknown> = {}) => {
    setError(null);
    if (!(await ask())) return;
    setBusy(true);
    try {
      await adminRequest(`platform/payment-proofs/${proof.id}/recovery/${path}`, { method: 'POST', body: { reason: reason.trim(), ...extra } });
      await onDone();
    } catch (e) {
      setError(e);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!state) return <ErrorNotice error={error} />;
  const end = state.subscription?.currentPeriodEnd ?? state.subscription?.complimentaryUntil ?? null;
  const ready = reason.trim().length > 0 && !busy;
  return (
    <div className="stack" data-testid="proof-recovery">
      <Notice tone="warn">{t(state.mayStillBeRunning ? 'admin.proofs.recovery.running' : 'admin.proofs.recovery.stopped')}</Notice>
      <ul>
        {state.request ? <li><Money amount={state.request.amount} /> · {t('admin.proofs.months')}: {state.request.months}</li> : null}
        <li>{t(state.paymentRecorded ? 'admin.proofs.recovery.paymentYes' : 'admin.proofs.recovery.paymentNo')}</li>
        <li>{t(state.periodApplied ? 'admin.proofs.recovery.periodYes' : 'admin.proofs.recovery.periodNo')}</li>
        <li>{t('admin.proofs.recovery.accessNow')}: {state.subscription?.status ?? '—'}{end ? ` · ${formatDate(end, lang)}` : ''}</li>
      </ul>
      <Field label={t('admin.proofs.recovery.reason')}>
        <input maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {state.actions.complete ? (
        <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => void act('complete')}>
          {t(state.periodApplied ? 'admin.proofs.recovery.finish' : 'admin.proofs.recovery.complete')}
        </button>
      ) : null}
      {state.actions.closeWithoutPeriod ? (
        <button type="button" className="btn" disabled={!ready} onClick={() => void act('complete', { closeWithoutPeriod: true })}>
          {t('admin.proofs.recovery.closeWithoutPeriod')}
        </button>
      ) : null}
      {state.actions.release ? (
        <button type="button" className="btn" disabled={!ready} onClick={() => void act('release')}>
          {t('admin.proofs.recovery.release')}
        </button>
      ) : null}
      <ErrorNotice error={error} />
    </div>
  );
}
