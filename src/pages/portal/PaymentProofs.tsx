import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { PaymentCategory, PaymentInstructions, PaymentProof, PlanQuote, PriceList, StoreStatus } from '../../api/types';
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
  // 0132 (docs/122): each store is its own subscription — its status, and which stores this payment covers.
  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [everyLine, setEveryLine] = useState<PlanQuote['lines']>([]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [error, setError] = useState<unknown>(null);
  // 0134 (owner, 2026-11-08): the price list, and what this payment is for.
  const [prices, setPrices] = useState<PriceList | null>(null);
  const [category, setCategory] = useState<PaymentCategory>('subscription');
  const [seatStore, setSeatStore] = useState<string>('');
  const [seats, setSeats] = useState(1);
  const [otherAmount, setOtherAmount] = useState('');
  const [otherNote, setOtherNote] = useState('');
  const [waitingLines, setWaitingLines] = useState<PlanQuote['lines']>([]);
  const [seatPrices, setSeatPrices] = useState<Record<number, number>>({});

  const load = useCallback(async (only: Set<string> | null = null, cat: PaymentCategory = 'subscription') => {
    try {
      const parts: string[] = [];
      if (only && only.size) parts.push(`branches=${encodeURIComponent([...only].join(','))}`);
      if (cat === 'subscription' || cat === 'store_activation') parts.push(`category=${cat}`);
      const query = parts.length ? `?${parts.join('&')}` : '';
      const [proofs, offered, instructions] = await Promise.all([
        ownerRequest<PaymentProof[]>('platform/my-subscription/payment-proofs'),
        ownerRequest<{ plans: PlanQuote[]; branches?: StoreStatus[]; prices?: PriceList }>(`platform/my-subscription/plans${query}`),
        ownerRequest<PaymentInstructions>('platform/payment-instructions'),
      ]);
      setRows(proofs);
      setPlans(offered.plans);
      if (offered.prices) setPrices(offered.prices);
      setStores(offered.branches ?? []);
      if (!only && cat === 'subscription') {
        // Every store and waiting request, as the unnarrowed quote names them (for the store list and the waiting notice).
        const all = await ownerRequest<{ plans: PlanQuote[] }>('platform/my-subscription/plans');
        setEveryLine(all.plans[0]?.lines ?? []);
        setWaitingLines((all.plans[0]?.lines ?? []).filter((l) => l.pending));
      }
      setPay(instructions);
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const toggle = (id: string) => {
    const next = new Set(picked ?? everyLine.map((l) => l.branchId));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // At least one store: a payment pays for something.
    if (next.size === 0) return;
    const all = next.size === everyLine.length;
    setPicked(all ? null : next);
    void load(all ? null : next, category);
  };
  const stateOf = (id: string) => stores.find((s) => s.branchId === id) ?? null;

  const open = rows?.some((p) => p.status === 'submitted' || p.status === 'under_review') ?? false;
  // 0130: the stores added in the app and waiting for activation — named by the server's quote, activated by a verified payment.
  const waiting = waitingLines;
  const openStores = everyLine.filter((l) => !l.pending);
  const choose = (c: PaymentCategory) => {
    setCategory(c);
    setPicked(null);
    void load(null, c);
  };
  // 0134: the extra seats' price for each period — the server's (the page multiplies nothing).
  useEffect(() => {
    if (category !== 'extra_seats' || !seatStore) return setSeatPrices({});
    let live = true;
    void Promise.all(
      ([1, 3, 12] as const).map((m) =>
        ownerRequest<{ price: { total: number } | null }>(`platform/my-subscription/payment-price?category=extra_seats&months=${m}&branches=${seatStore}&seats=${seats}`).then((r) => [m, r.price?.total ?? 0] as const),
      ),
    )
      .then((all) => live && setSeatPrices(Object.fromEntries(all)))
      .catch((e: unknown) => live && setError(e));
    return () => {
      live = false;
    };
  }, [category, seatStore, seats]);

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
      {waiting.length ? (
        <Notice tone="info">
          <strong>{t('portal.branches.pending.title')}</strong>{' '}
          {waiting.map((l, i) => (
            <span key={l.branchId}>
              {i ? ', ' : ''}
              <bdi>{l.name}</bdi>
            </span>
          ))}
          . {t(open ? 'portal.branches.pending.review' : 'portal.branches.pending.body')}
        </Notice>
      ) : null}
      {everyLine.length ? (
        <fieldset className="stack-tight" aria-describedby="stores-help">
          <legend>{t('portal.stores.title')}</legend>
          <p id="stores-help" className="muted small">{t('portal.stores.help')}</p>
          {everyLine.map((l) => {
            const s = stateOf(l.branchId);
            const ends = s?.paidUntil ?? s?.trialEndsAt ?? s?.complimentaryUntil ?? null;
            return (
              <label key={l.branchId} className="row spread" data-testid="store-choice">
                <span className="row">
                  <input type="checkbox" checked={picked ? picked.has(l.branchId) : true} disabled={open} onChange={() => toggle(l.branchId)} />
                  <bdi>{lang === 'ar' && s?.nameAr ? s.nameAr : l.name}</bdi>
                </span>
                <span className="small">
                  <Badge tone={s?.canWrite ? 'ok' : 'warn'}>{t(`portal.stores.state.${l.pending ? 'locked' : (s?.state ?? 'locked')}` as Key)}</Badge>
                  {ends ? <> · {t(s?.graceEndsAt ? 'portal.stores.graceUntil' : 'portal.stores.until', { date: formatDate(s?.graceEndsAt ?? ends, lang) })}</> : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : null}
      {prices ? <PriceTable prices={prices} /> : null}
      {!open && plans ? (
        <fieldset className="stack-tight" data-testid="payment-category">
          <legend>{t('payment.category.question')}</legend>
          {(['subscription', 'store_activation', 'extra_seats', 'other'] as const)
            .filter((c) => c !== 'store_activation' || waiting.length > 0)
            .map((c) => (
              <label key={c} className="row">
                <input type="radio" name="payment-category" checked={category === c} onChange={() => choose(c)} />
                {t(`payment.category.${c}` as Key)}
              </label>
            ))}
        </fieldset>
      ) : null}
      {open ? (
        <p className="muted small">{t('portal.proof.waiting')}</p>
      ) : plans && category === 'extra_seats' ? (
        <div className="stack-tight" data-testid="extra-seats">
          <label className="field">
            {t('payment.store.one')}
            <select value={seatStore} onChange={(e) => setSeatStore(e.target.value)}>
              <option value="">—</option>
              {openStores.map((l) => (
                <option key={l.branchId} value={l.branchId}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('payment.seats')}
            <input type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </label>
          <div className="grid plans">
            {([1, 3, 12] as const).map((m) => (
              <div key={m} className="card stack-tight plan" data-months={m}>
                <h3>{t(monthsKey(m))}</h3>
                <p className="plan-total">{seatPrices[m] !== undefined ? <Money amount={seatPrices[m]} /> : '—'}</p>
                <button type="button" className="btn btn-primary" disabled={!seatStore || seatPrices[m] === undefined} onClick={() => setChosen({ months: m, lines: [], total: seatPrices[m] ?? 0 })}>
                  {t('portal.plans.choose')}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : plans && category === 'other' ? (
        <div className="stack-tight" data-testid="other-payment">
          <label className="field">
            {t('admin.action.amount')}
            <input inputMode="numeric" dir="ltr" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="field">
            {t('payment.other.note')}
            <textarea maxLength={500} rows={2} value={otherNote} onChange={(e) => setOtherNote(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" disabled={!Number(otherAmount) || !otherNote.trim()} onClick={() => setChosen({ months: 1, lines: [], total: Number(otherAmount) })}>
            {t('portal.plans.choose')}
          </button>
        </div>
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
                      <span>
                        <bdi>{l.name}</bdi>
                        {l.pending ? <> <Badge tone="warn">{t('portal.branches.pending.badge')}</Badge></> : null}
                      </span>
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
        category={category}
        extra={
          category === 'extra_seats'
            ? { branches: seatStore, seats: String(seats) }
            : category === 'other'
              ? { amount: otherAmount, paidAt: new Date().toISOString(), note: otherNote.trim() }
              : {}
        }
        branches={category === 'subscription' || category === 'store_activation' ? (chosen?.lines.map((l) => l.branchId).filter((id) => !picked || picked.has(id)) ?? null) : null}
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
  category,
  extra,
  branches,
  instructions,
  onClose,
  onDone,
}: {
  plan: PlanQuote | null;
  /** 0134: what the payment is for, and the fields that category adds (seats, or an adjustment's amount and note). */
  category: PaymentCategory;
  extra: Record<string, string>;
  /** 0132: the stores chosen; null — every store, as quoted. */
  branches: string[] | null;
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
    body.set('category', category);
    if (category !== 'other') body.set('months', String(plan.months));
    // 0132: the stores chosen — none named means every store, as quoted.
    if (branches?.length) body.set('branches', branches.join(','));
    for (const [k, v] of Object.entries(extra)) if (v) body.set(k, v);
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
            {t(`payment.category.${category}` as Key)} · {category !== 'other' ? <>{t(monthsKey(plan.months))} · </> : null}
            <Money amount={plan.total} />
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

/** 0134: the one price list — every store and seat, per period — the server's figures. */
function PriceTable({ prices }: { prices: PriceList }) {
  const { t } = useI18n();
  const table = prices.table;
  if (!table) return null;
  const rows: Array<[Key, Record<string, number>]> = [
    ['payment.prices.electronics', table.electronics],
    ['payment.prices.agent', table.money_agent],
    ['payment.prices.both', table.both],
    ['payment.prices.seat', table.seat],
  ];
  return (
    <table className="table small" data-testid="price-list">
      <caption>{t('payment.prices.title')}</caption>
      <thead>
        <tr>
          <th />
          {prices.months.map((m) => (
            <th key={m} scope="col">
              {t(monthsKey(m))}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, by]) => (
          <tr key={label}>
            <th scope="row">{t(label)}</th>
            {prices.months.map((m) => (
              <td key={m}>
                <Money amount={by[String(m)] ?? 0} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
