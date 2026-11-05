import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { PaymentInstructions, PaymentProof, PlanQuote } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { Badge, ErrorNotice, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate } from '../../lib/format';

const MAX_BYTES = 5 * 1024 * 1024;
const newKey = () => crypto.randomUUID();
const monthsKey = (m: number | null): Key => (m === 1 ? 'portal.plans.months.1' : m === 3 ? 'portal.plans.months.3' : 'portal.plans.months.12');

/**
 * The Owner chooses a plan and pays (owner, 2026-11-05).
 *
 * 1. **Plans:** 1, 3 or 12 months, priced by the server per store (`GET platform/my-subscription/plans`) — the page shows
 *    the server's figures and holds none of its own.
 * 2. **Pay:** a dialog with the amount and the number of each payment service offered, each with a copy button
 *    (`GET platform/payment-instructions`: only what the platform offers, never a stand-in).
 * 3. **Confirm payment:** a screenshot of the payment, sent with the plan. The server records the plan's amount, and the
 *    administrators get a WhatsApp alert; access changes only once an administrator verifies it.
 */
export function PaymentProofs({ onChanged }: { onChanged: () => void | Promise<void> }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<PaymentProof[] | null>(null);
  const [plans, setPlans] = useState<PlanQuote[] | null>(null);
  const [pay, setPay] = useState<PaymentInstructions | null>(null);
  const [chosen, setChosen] = useState<PlanQuote | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const [proofs, offered, instructions] = await Promise.all([
        ownerRequest<PaymentProof[]>('platform/my-subscription/payment-proofs'),
        ownerRequest<{ plans: PlanQuote[] }>('platform/my-subscription/plans'),
        ownerRequest<PaymentInstructions>('platform/payment-instructions'),
      ]);
      setRows(proofs);
      setPlans(offered.plans);
      setPay(instructions);
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const open = rows?.some((p) => p.status === 'submitted' || p.status === 'under_review') ?? false;

  return (
    <section className="card stack" aria-labelledby="plans-h">
      <h2 id="plans-h">{t('portal.plans.title')}</h2>
      {rows?.map((p) => (
        <div key={p.id} className="stack">
          <div className="row spread">
            <span>
              {p.months ? `${t(monthsKey(p.months))} · ` : ''}
              <Money amount={p.amount} /> · {formatDate(p.paidAt, lang)}
            </span>
            <Badge tone={p.status === 'approved' ? 'ok' : p.status === 'refused' ? 'danger' : 'warn'}>{t(`portal.proof.status.${p.status}` as Key)}</Badge>
          </div>
          {p.status === 'refused' && p.refusalReason ? <Notice tone="danger">{t('portal.proof.refused', { reason: p.refusalReason })}</Notice> : null}
        </div>
      ))}
      <ErrorNotice error={error} />
      {open ? (
        <p className="muted small">{t('portal.proof.waiting')}</p>
      ) : plans ? (
        <>
          <p className="muted small">{t('portal.plans.intro')}</p>
          <div className="grid plans">
            {plans.map((plan) => (
              <div key={plan.months} className="card stack-tight plan" data-months={plan.months}>
                <h3>{t(monthsKey(plan.months))}</h3>
                <p className="plan-total">
                  <Money amount={plan.total} />
                </p>
                <ul className="stack-tight small">
                  {plan.lines.map((l) => (
                    <li key={l.branchId} className="row spread">
                      <bdi>{l.name}</bdi>
                      <Money amount={l.amount} />
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn-primary" disabled={plan.total <= 0} onClick={() => setChosen(plan)}>
                  {t('portal.plans.choose')}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <PayDialog
        plan={chosen}
        instructions={pay}
        onClose={() => setChosen(null)}
        onDone={async () => {
          setChosen(null);
          await load();
          await onChanged();
        }}
      />
    </section>
  );
}

/** The amount, where to send it — each number with its copy button — and the screenshot to confirm it with. */
function PayDialog({
  plan,
  instructions,
  onClose,
  onDone,
}: {
  plan: PlanQuote | null;
  instructions: PaymentInstructions | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const key = useRef(newKey());
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [problem, setProblem] = useState<Key | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (plan && !d.open) d.showModal?.();
    if (!plan && d.open) d.close();
    if (!plan) {
      setFile(null);
      setProblem(null);
      setError(null);
      setCopied(null);
      key.current = newKey();
    }
  }, [plan]);

  const offered = instructions?.available ? instructions.providers.filter((p) => p.code) : [];
  const copy = async (code: string, provider: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(provider);
    } catch {
      setCopied(null);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setError(null);
    setProblem(null);
    if (!file) return setProblem('portal.proof.problem.file');
    if (file.size > MAX_BYTES) return setProblem('portal.proof.problem.size');
    const body = new FormData();
    body.set('idempotencyKey', key.current);
    body.set('months', String(plan.months));
    body.set('file', file);
    setBusy(true);
    try {
      await ownerRequest('platform/my-subscription/payment-proofs', { method: 'POST', body });
      if (input.current) input.current.value = '';
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="modal" onCancel={onClose} aria-labelledby="pay-title">
      {plan ? (
        <form className="body stack" onSubmit={confirm}>
          <h2 id="pay-title">
            {t(monthsKey(plan.months))} · <Money amount={plan.total} />
          </h2>
          {offered.length > 0 ? (
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
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={t('portal.pay.copy', { provider: p.label })}
                        title={t('portal.pay.copy', { provider: p.label })}
                        onClick={() => void copy(p.code, p.key)}
                      >
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                        </svg>
                        <span>{copied === p.key ? t('portal.pay.copied') : t('portal.pay.copyShort')}</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Notice tone="info">{t('account.payment.none')}</Notice>
          )}
          <label className="field">
            {t('portal.pay.dialog.upload')}
            <input ref={input} type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {problem ? <Notice tone="danger">{t(problem)}</Notice> : null}
          <ErrorNotice error={error} />
          <p className="muted small">{t('portal.proof.intro')}</p>
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy || offered.length === 0}>
              {t('portal.pay.confirm')}
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
