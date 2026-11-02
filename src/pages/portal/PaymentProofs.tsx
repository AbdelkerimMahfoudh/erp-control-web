import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { PaymentProof } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { Badge, ErrorNotice, Field, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate } from '../../lib/format';

const MAX_BYTES = 5 * 1024 * 1024;
const newKey = () => crypto.randomUUID();

/**
 * The Owner tells us a payment was made (D227): a private file with the amount and date. Sending changes nothing about
 * access: an administrator checks it and records the real payment, and a refusal comes back with its reason to correct.
 */
export function PaymentProofs({ onChanged }: { onChanged: () => void | Promise<void> }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<PaymentProof[] | null>(null);
  const [form, setForm] = useState({ amount: '', paidAt: '', reference: '' });
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<Key | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  // One attempt, one key: a retry of a lost answer is the same proof.
  const key = useRef(newKey());
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setRows(await ownerRequest<PaymentProof[]>('platform/my-subscription/payment-proofs'));
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const open = rows?.some((p) => p.status === 'submitted' || p.status === 'under_review') ?? false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setProblem(null);
    if (!file) return setProblem('portal.proof.problem.file');
    if (file.size > MAX_BYTES) return setProblem('portal.proof.problem.size');
    const body = new FormData();
    body.set('idempotencyKey', key.current);
    body.set('amount', form.amount.trim());
    body.set('paidAt', new Date(form.paidAt).toISOString());
    if (form.reference.trim()) body.set('reference', form.reference.trim());
    body.set('file', file);
    setBusy(true);
    try {
      await ownerRequest('platform/my-subscription/payment-proofs', { method: 'POST', body });
      key.current = newKey();
      setForm({ amount: '', paidAt: '', reference: '' });
      setFile(null);
      if (input.current) input.current.value = '';
      await load();
      await onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" aria-labelledby="proofs-h">
      <h2 id="proofs-h">{t('portal.proof.title')}</h2>
      {rows?.map((p) => (
        <div key={p.id} className="stack">
          <div className="row spread">
            <span>
              <Money amount={p.amount} /> · {formatDate(p.paidAt, lang)}
            </span>
            <Badge tone={p.status === 'approved' ? 'ok' : p.status === 'refused' ? 'danger' : 'warn'}>{t(`portal.proof.status.${p.status}` as Key)}</Badge>
          </div>
          {p.status === 'refused' && p.refusalReason ? <Notice tone="danger">{t('portal.proof.refused', { reason: p.refusalReason })}</Notice> : null}
        </div>
      ))}
      {open ? (
        <p className="muted small">{t('portal.proof.waiting')}</p>
      ) : (
        <form className="stack" onSubmit={submit}>
          <p className="muted small">{t('portal.proof.intro')}</p>
          <div className="grid">
            <Field label={t('portal.proof.amount')}>
              <input required inputMode="decimal" dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t('portal.proof.date')}>
              <input required type="date" dir="ltr" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            </Field>
            <Field label={t('portal.proof.reference')}>
              <input maxLength={120} dir="ltr" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
          </div>
          <Field label={t('portal.proof.file')}>
            <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          {problem ? <Notice tone="danger">{t(problem)}</Notice> : null}
          <ErrorNotice error={error} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('portal.proof.send')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
