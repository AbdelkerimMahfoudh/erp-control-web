import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBase } from '../../api/client';
import type { PaymentProof } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Empty, ErrorNotice, Field, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate } from '../../lib/format';
import { useStepUp } from './useStepUp';

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

function ProofRow({ proof, ask, onDone }: { proof: PaymentProof; ask: () => Promise<string | null>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState({ amount: proof.amount, paidAt: proof.paidAt.slice(0, 10), months: '1', channel: 'manual', reason: '' });
  const [refusal, setRefusal] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const act = async (path: 'approve' | 'refuse', body: Record<string, unknown>) => {
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      await adminRequest(`platform/payment-proofs/${proof.id}/${path}`, { method: 'POST', body: { ...body, confirmPassword } });
      await onDone();
    } catch (e) {
      setError(e);
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
      {proof.fileAvailable ? (
        <a className="btn" href={`${apiBase()}/platform/payment-proofs/${proof.id}/file`} rel="noreferrer">
          {t('admin.proofs.download')}
        </a>
      ) : (
        <Notice tone="warn">{t('admin.proofs.purged')}</Notice>
      )}
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
      <ErrorNotice error={error} />
    </section>
  );
}
