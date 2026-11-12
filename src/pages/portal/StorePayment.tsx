import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PaymentInstructions, PaymentProof, SeatRequest } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { ErrorNotice, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate } from '../../lib/format';

const MAX_BYTES = 5 * 1024 * 1024;
const MONTHS = [1, 3, 12] as const;
const monthsKey = (m: number): Key => (m === 1 ? 'portal.plans.months.1' : m === 3 ? 'portal.plans.months.3' : 'portal.plans.months.12');
/** What the server accepts as the number paid from: digits with an optional +, spaces, dots and dashes dropped. */
export const payerPhoneValid = (raw: string) => /^\+?\d{6,20}$/.test(raw.trim().replace(/[\s.-]/g, ''));

/** The open proof (sent, not yet decided) that pays for this waiting store, if any. */
export function openProofFor(storeId: string, proofs: PaymentProof[] | null): PaymentProof | null {
  return proofs?.find((p) => (p.status === 'submitted' || p.status === 'under_review') && p.lines?.some((l) => l.branchId.toLowerCase() === storeId.toLowerCase())) ?? null;
}

/**
 * A waiting store's payment (owner, 2026-11-11). Opened from its "Waiting for payment" status: the period with the
 * server's price for that store, each payment number with its copy button, the number the Owner paid from and the
 * screenshot; sent, the store waits for confirmation. Opened again from "Waiting for confirmation": the proof as sent,
 * whose number and screenshot can be corrected until the platform decides (each correction is a new revision).
 */
export function StorePayDialog({
  request,
  proof,
  instructions,
  onClose,
  onDone,
}: {
  request: SeatRequest | null;
  proof: PaymentProof | null;
  instructions: PaymentInstructions | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { t, lang } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const key = useRef(crypto.randomUUID());
  const [months, setMonths] = useState<number>(1);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [payer, setPayer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [problem, setProblem] = useState<Key | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const editing = !!proof;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (request && !d.open) d.showModal?.();
    if (!request && d.open) d.close();
    setFile(null);
    setProblem(null);
    setError(null);
    setCopied(null);
    setPayer(proof?.payerPhone ?? '');
    setMonths(proof?.months ?? 1);
    key.current = crypto.randomUUID();
    if (fileInput.current) fileInput.current.value = '';
  }, [request, proof]);

  // The server's price for this store over each period; the page computes none.
  useEffect(() => {
    if (!request || editing) return;
    let live = true;
    void Promise.all(
      MONTHS.map((m) =>
        ownerRequest<{ price: { total: number } | null }>(`platform/my-subscription/payment-price?category=store_activation&months=${m}&branches=${request.id}`).then((r) => [m, r.price?.total ?? 0] as const),
      ),
    )
      .then((all) => live && setPrices(Object.fromEntries(all)))
      .catch((e: unknown) => live && setError(e));
    return () => {
      live = false;
    };
  }, [request, editing]);

  const offered = instructions?.available ? instructions.providers.filter((p) => p.code) : [];
  const copy = async (code: string, provider: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(provider);
    } catch {
      setCopied(null);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setError(null);
    setProblem(null);
    if (!payerPhoneValid(payer)) return setProblem('portal.store.problem.payer');
    if (!editing && !file) return setProblem('portal.proof.problem.file');
    if (file && file.size > MAX_BYTES) return setProblem('portal.proof.problem.size');
    const body = new FormData();
    body.set('payerPhone', payer.trim());
    if (file) body.set('file', file);
    setBusy(true);
    try {
      if (proof) {
        if (!file && payer.trim().replace(/[\s.-]/g, '') === (proof.payerPhone ?? '')) {
          setProblem('portal.store.problem.unchanged');
          return;
        }
        body.set('revision', String(proof.revision ?? 1));
        await ownerRequest(`platform/my-subscription/payment-proofs/${proof.id}/correct`, { method: 'POST', body });
      } else {
        body.set('idempotencyKey', key.current);
        body.set('category', 'store_activation');
        body.set('months', String(months));
        body.set('branches', request.id);
        await ownerRequest('platform/my-subscription/payment-proofs', { method: 'POST', body });
      }
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const name = request?.label ?? '';
  const amount = proof ? Number(proof.amount) : prices[months];
  return (
    <dialog ref={ref} className="modal" onCancel={onClose} aria-labelledby="store-pay-title">
      {request ? (
        <form className="body stack" onSubmit={send}>
          <h2 id="store-pay-title">{t('portal.store.payTitle', { store: name })}</h2>
          {/* 0132 (owner, 2026-11-12): a store added in the app opens when its payment is confirmed, even during the free trial. */}
          <p className="small">{t('trial.addons.appStoreOpens')}</p>
          {editing ? (
            <>
              <Notice tone="info">{t('portal.store.correctionNote')}</Notice>
              <p>
                {t(monthsKey(proof.months ?? 1))} · <Money amount={amount ?? 0} />
                {proof.revisedAt ? <span className="muted small"> · {t('portal.store.revised', { when: formatDate(proof.revisedAt, lang) })}</span> : null}
              </p>
            </>
          ) : (
            <fieldset className="stack-tight">
              <legend>{t('payment.months')}</legend>
              {MONTHS.map((m) => (
                <label key={m} className="row">
                  <input type="radio" name="store-months" checked={months === m} onChange={() => setMonths(m)} />
                  <span>
                    {t(monthsKey(m))} · {prices[m] !== undefined ? <Money amount={prices[m]} /> : '—'}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {!editing && offered.length > 0 ? (
            <>
              <p>{t('portal.pay.dialog.number')}</p>
              <ul className="stack-tight">
                {offered.map((p) => (
                  <li key={p.key} className="row spread pay-number">
                    <strong>{p.label}</strong>
                    <span className="row">
                      <span className="ltr" dir="ltr">
                        {p.code}
                      </span>
                      <button type="button" className="btn btn-sm" aria-label={t('portal.pay.copy', { provider: p.label })} onClick={() => void copy(p.code, p.key)}>
                        {copied === p.key ? t('portal.pay.copied') : t('portal.pay.copyShort')}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : !editing ? (
            <Notice tone="info">{t('account.payment.none')}</Notice>
          ) : null}
          <label className="field">
            {t('portal.store.payer')}
            <input type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={payer} onChange={(e) => setPayer(e.target.value)} />
          </label>
          <label className="field">
            {editing ? t('portal.store.replaceScreenshot') : t('portal.store.screenshot')}
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {problem ? <Notice tone="danger">{t(problem)}</Notice> : null}
          <ErrorNotice error={error} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy || (!editing && (offered.length === 0 || prices[months] === undefined))}>
              {editing ? t('portal.store.saveCorrection') : t('portal.store.send')}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              {t('action.cancel')}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
