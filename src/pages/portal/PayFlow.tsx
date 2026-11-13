import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Activity, NewStoreOption, PaymentInstructions, PaymentProof, PlanQuote, StoreStatus } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { Badge, ErrorNotice, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, formatMru, payerInput } from '../../lib/format';
import { arabicNameProblem, latinNameProblem, nameProblemKey, normalizeName } from '../../lib/names';

const MAX_BYTES = 5 * 1024 * 1024;
const MONTHS = [1, 3, 12] as const;
type Months = (typeof MONTHS)[number];
/** One action per proof (owner, 2026-11-12): renew stores, activate a waiting store, or an extra seat at one store. */
export type PayAction = 'renew' | 'activate' | 'seat';
const newKey = () => crypto.randomUUID();
const monthsKey = (m: number | null): Key => (m === 1 ? 'portal.plans.months.1' : m === 3 ? 'portal.plans.months.3' : 'portal.plans.months.12');

/** What an app request the activation link was for says, read from the server by its id (never from the address). */
export interface PendingRequest {
  id: string;
  kind: 'store' | 'seat';
  label: string | null;
  labelAr: string | null;
  activity: Activity | null;
  store: { id: string; name: string } | null;
  person: { name: string } | null;
  monthlyAmount: number;
}

/** A receiving service and number the server offers: only those pairs exist here. */
export function receiversOf(instructions: PaymentInstructions | null): { service: string; label: string; number: string }[] {
  if (!instructions?.available) return [];
  return instructions.providers.flatMap((p) => (p.codes?.length ? p.codes : [p.code]).filter(Boolean).map((number) => ({ service: p.key, label: p.label, number })));
}

/** "36 96 38 39": a receiving number as people read it. */
const spaced = (n: string) => n.replace(/(\d{2})(?=\d)/g, '$1 ');

/**
 * The one payment flow (owner, 2026-11-12): choose the store(s), the action, the term, read the server's line items and
 * total, then pay by hand and send the proof. One action per proof; a seat is one store's. "Add a store" sits beside the
 * stores. The page never prices anything: every figure is the server's quote for exactly what is chosen.
 */
export function PayFlow({ onChanged, landing, newStore = null }: { onChanged: () => void | Promise<void>; landing?: PendingRequest | null; /** What a new store of each activity costs now, and what it replaces (D158) — the server's. */ newStore?: NewStoreOption[] | null }) {
  const { t, lang } = useI18n();
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);
  const [lines, setLines] = useState<PlanQuote['lines']>([]);
  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [action, setAction] = useState<PayAction>(landing?.kind === 'seat' ? 'seat' : landing?.kind === 'store' ? 'activate' : 'renew');
  const [picked, setPicked] = useState<Set<string>>(new Set(landing?.kind === 'store' ? [landing.id] : landing?.store ? [landing.store.id] : []));
  const [months, setMonths] = useState<Months>(1);
  const [quote, setQuote] = useState<{ lines: { name: string; amount: number }[]; total: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<'new' | PaymentProof | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const [p, plans, ins] = await Promise.all([
        ownerRequest<PaymentProof[]>('platform/my-subscription/payment-proofs'),
        ownerRequest<{ plans: PlanQuote[]; branches?: StoreStatus[] }>('platform/my-subscription/plans'),
        ownerRequest<PaymentInstructions>('platform/payment-instructions'),
      ]);
      setProofs(p);
      setLines(plans.plans[0]?.lines ?? []);
      setStores(plans.branches ?? []);
      setInstructions(ins);
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const active = lines.filter((l) => !l.pending);
  const waiting = lines.filter((l) => l.pending);
  // The stores the action applies to: open stores for a renewal or a seat, waiting ones for an activation.
  const choices = action === 'activate' ? waiting : active;
  // One store preselected when there is only one; a seat or an activation is always one store.
  useEffect(() => {
    if (!lines.length) return;
    setPicked((now) => {
      const valid = new Set([...now].filter((id) => choices.some((c) => c.branchId === id)));
      if (action !== 'renew' && valid.size > 1) return new Set([[...valid][0]!]);
      if (valid.size === 0 && choices.length === 1) return new Set([choices[0]!.branchId]);
      if (valid.size === 0 && action === 'renew') return new Set(choices.map((c) => c.branchId));
      return valid;
    });
  }, [action, lines]);

  const ids = useMemo(() => [...picked].filter((id) => choices.some((c) => c.branchId === id)), [picked, choices]);
  const ready = ids.length > 0 && (action === 'renew' || ids.length === 1);

  // The server's quote for exactly this choice.
  useEffect(() => {
    if (!ready) return setQuote(null);
    let live = true;
    const branches = encodeURIComponent(ids.join(','));
    const ask =
      action === 'seat'
        ? ownerRequest<{ price: { total: number } | null }>(`platform/my-subscription/payment-price?category=extra_seats&months=${months}&branches=${branches}&seats=1`).then((r) => {
            const store = active.find((l) => l.branchId === ids[0]);
            const total = r.price?.total ?? 0;
            return { lines: [{ name: `${store?.name ?? ''} · ${t('pay.line.seat')}`, amount: total }], total };
          })
        : ownerRequest<{ plans: PlanQuote[] }>(`platform/my-subscription/plans?branches=${branches}&category=${action === 'activate' ? 'store_activation' : 'subscription'}`).then((r) => {
            const plan = r.plans.find((p) => p.months === months);
            return plan ? { lines: plan.lines.map((l) => ({ name: l.name, amount: l.amount })), total: plan.total } : null;
          });
    ask.then((q) => live && setQuote(q)).catch((e: unknown) => live && setError(e));
    return () => {
      live = false;
    };
  }, [action, months, ids.join(','), ready]);

  const open = proofs?.find((p) => p.status === 'submitted' || p.status === 'under_review') ?? null;
  const stateOf = (id: string) => stores.find((s) => s.branchId === id) ?? null;
  const toggle = (id: string) => {
    if (action !== 'renew') return setPicked(new Set([id]));
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  return (
    <section className="card stack pay-flow" aria-labelledby="pay-flow-h">
      <h2 id="pay-flow-h">{t('pay.title')}</h2>
      <ErrorNotice error={error} />

      {proofs?.filter((p) => p.status !== 'approved' || p === proofs[0]).slice(0, 3).map((p) => (
        <div key={p.id} className="pay-proof row spread">
          <span className="small">
            {p.months ? `${t(monthsKey(p.months))} · ` : ''}
            <Money amount={p.amount} /> · {formatDate(p.submittedAt, lang)}
          </span>
          <span className="row">
            <Badge tone={p.status === 'approved' ? 'ok' : p.status === 'refused' ? 'danger' : 'warn'}>{t(`pay.status.${p.status}` as Key)}</Badge>
            {p.status === 'submitted' ? (
              <button type="button" className="btn btn-sm" onClick={() => setPaying(p)}>
                {t('pay.correct')}
              </button>
            ) : null}
          </span>
          {p.status === 'refused' && p.refusalReason ? <Notice tone="danger">{t('portal.proof.refused', { reason: p.refusalReason })}</Notice> : null}
        </div>
      ))}

      {open ? (
        <Notice tone="info">{t('pay.waiting')}</Notice>
      ) : (
        <>
          <div className="pay-step">
            <div className="row spread">
              <h3>
                <span className="pay-n">1</span> {t('pay.step.stores')}
              </h3>
              <button type="button" className="btn btn-sm" onClick={() => setAdding(!adding)} aria-expanded={adding}>
                + {t('pay.addStore')}
              </button>
            </div>
            {adding ? (
              <AddStore
                newStore={newStore}
                onAdded={async (id) => {
                  setAdding(false);
                  await load();
                  setAction('activate');
                  setPicked(new Set([id]));
                }}
              />
            ) : null}
            <div className="pay-stores" style={{ ['--pay-cols' as string]: String(Math.max(1, Math.min(3, choices.length))) }} role={action === 'renew' ? 'group' : 'radiogroup'} aria-label={t('pay.step.stores')}>
              {choices.map((l) => {
                const s = stateOf(l.branchId);
                const ends = s?.paidUntil ?? s?.trialEndsAt ?? s?.complimentaryUntil ?? null;
                return (
                  <label key={l.branchId} className={ids.includes(l.branchId) ? 'pay-store on' : 'pay-store'} data-testid="store-choice">
                    <input type={action === 'renew' ? 'checkbox' : 'radio'} name="pay-store" checked={ids.includes(l.branchId)} onChange={() => toggle(l.branchId)} />
                    <span>
                      <strong>
                        <bdi>{lang === 'ar' && s?.nameAr ? s.nameAr : l.name}</bdi>
                      </strong>
                      <small>
                        {t(`activity.${l.activity}` as Key)}
                        {l.pending ? ` · ${t('portal.branches.pending.badge')}` : ends ? ` · ${t('portal.stores.until', { date: formatDate(ends, lang) })}` : ''}
                      </small>
                    </span>
                  </label>
                );
              })}
              {choices.length === 0 ? <p className="muted small">{t(action === 'activate' ? 'pay.none.waiting' : 'pay.none.active')}</p> : null}
            </div>
          </div>

          <div className="pay-step">
            <h3>
              <span className="pay-n">2</span> {t('pay.step.action')}
            </h3>
            <div className="pay-choices" role="radiogroup" aria-label={t('pay.step.action')}>
              {(['renew', 'activate', 'seat'] as const).map((a) => (
                <button key={a} type="button" role="radio" aria-checked={action === a} className={action === a ? 'pay-choice on' : 'pay-choice'} onClick={() => setAction(a)}>
                  {t(`pay.action.${a}` as Key)}
                  <small>{t(`pay.action.${a}.hint` as Key)}</small>
                </button>
              ))}
            </div>
            {/* 0137: an additional store opens on its own approved payment, even during the trial, with no trial of its own. */}
            {action === 'activate' ? <p className="muted small">{t('trial.addons.appStoreOpens')}</p> : null}
            {action === 'seat' ? (
              <p className="muted small">{landing?.kind === 'seat' && landing.person ? t('pay.seat.for', { name: landing.person.name }) : t('pay.seat.team')}</p>
            ) : null}
            {action !== 'renew' && ids.length > 1 ? <p className="hint">{t('pay.oneStore')}</p> : null}
          </div>

          <div className="pay-step">
            <h3>
              <span className="pay-n">3</span> {t('pay.step.term')}
            </h3>
            <div className="pay-choices pay-terms" role="radiogroup" aria-label={t('pay.step.term')}>
              {MONTHS.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={months === m} className={months === m ? 'pay-choice on' : 'pay-choice'} onClick={() => setMonths(m)}>
                  {t(monthsKey(m))}
                </button>
              ))}
            </div>
          </div>

          <div className="pay-step">
            <h3>
              <span className="pay-n">4</span> {t('pay.step.review')}
            </h3>
            <div className="pay-quote" data-testid="pay-quote">
              {quote ? (
                <>
                  {quote.lines.map((l, i) => (
                    <div key={i} className="row spread">
                      <span>
                        <bdi>{l.name}</bdi>
                      </span>
                      <Money amount={l.amount} />
                    </div>
                  ))}
                  <div className="row spread pay-total">
                    <span>{t('pay.total')}</span>
                    <Money amount={quote.total} />
                  </div>
                </>
              ) : (
                <p className="muted small">{t('pay.chooseFirst')}</p>
              )}
            </div>
            <div className="row spread">
              <p className="muted small">{t('pay.serverNote')}</p>
              <button type="button" className="btn btn-primary" disabled={!quote || quote.total <= 0} onClick={() => setPaying('new')}>
                {t('pay.continue')}
              </button>
            </div>
          </div>
        </>
      )}

      <PayWindow
        open={paying}
        action={action}
        months={months}
        branches={ids}
        total={quote?.total ?? 0}
        instructions={instructions}
        onClose={() => setPaying(null)}
        onDone={async () => {
          setPaying(null);
          await load();
          await onChanged();
        }}
      />
    </section>
  );
}

/** "Add a store" beside the stores: its name, its Arabic name and its activity — a request the server prices. */
function AddStore({ onAdded, newStore }: { onAdded: (id: string) => Promise<void>; newStore: NewStoreOption[] | null }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [activity, setActivity] = useState<Activity>('electronics');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [problems, setProblems] = useState<{ name?: Key; nameAr?: Key }>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // D225: the Arabic name is optional; given, it must be Arabic and the other name Latin — said before anything is sent.
    const hasAr = normalizeName(nameAr) !== '';
    const latin = hasAr ? latinNameProblem(name) : normalizeName(name) ? null : 'name_blank';
    const arabic = hasAr ? arabicNameProblem(nameAr) : null;
    const found = { name: latin ? nameProblemKey(latin) : undefined, nameAr: arabic ? nameProblemKey(arabic) : undefined };
    setProblems(found);
    if (found.name || found.nameAr) return;
    setBusy(true);
    setError(null);
    try {
      const r = await ownerRequest<{ allocation: { id: string } }>('platform/my-subscription/store-requests', { method: 'POST', body: { name: name.trim(), ...(nameAr.trim() ? { nameAr: nameAr.trim() } : {}), activity } });
      await onAdded(r.allocation.id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pay-add stack-tight" onSubmit={submit}>
      <div className="pay-fields">
        <label className="field">
          {t('account.requests.store.name')}
          <input required maxLength={80} dir="ltr" value={name} aria-invalid={problems.name ? true : undefined} onChange={(e) => setName(e.target.value)} />
          {problems.name ? <span className="field-error">{t(problems.name)}</span> : null}
        </label>
        <label className="field">
          {t('portal.store.nameAr')}
          <input maxLength={80} dir="rtl" lang="ar" value={nameAr} aria-invalid={problems.nameAr ? true : undefined} onChange={(e) => setNameAr(e.target.value)} />
          {problems.nameAr ? <span className="field-error">{t(problems.nameAr)}</span> : null}
        </label>
        <label className="field">
          {t('account.requests.store.activity')}
          <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
            {(['electronics', 'money_agent', 'both'] as const).map((a) => {
              const price = newStore?.find((n) => n.activity === a)?.monthly ?? null;
              const label = t(`activity.${a}` as Key);
              return (
                <option key={a} value={a}>
                  {price !== null ? t('account.requests.option', { activity: label, amount: formatMru(price, lang) }) : label}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <ReplacementNote option={newStore?.find((n) => n.activity === activity) ?? null} />
      <ErrorNotice error={error} />
      <button type="submit" className="btn btn-sm" disabled={busy || !name.trim()}>
        {t('pay.addStore.submit')}
      </button>
    </form>
  );
}

/**
 * The manual-payment window: the amount, where to send it — each service with only the numbers it really receives on —
 * the service and number the Owner used, the number paid from, and the screenshot. The same window corrects a proof still
 * waiting (its revision named, so a decision made on the earlier one is refused).
 */
function PayWindow({
  open,
  action,
  months,
  branches,
  total,
  instructions,
  onClose,
  onDone,
}: {
  open: 'new' | PaymentProof | null;
  action: PayAction;
  months: Months;
  branches: string[];
  total: number;
  instructions: PaymentInstructions | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const key = useRef(newKey());
  const correcting = open && open !== 'new' ? open : null;
  const receivers = receiversOf(instructions);
  const [receiver, setReceiver] = useState('');
  const [payer, setPayer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<Key | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // The eight digits exactly as the server lists them — never the spaced or right-to-left text on the screen.
  const copy = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(number);
      setTimeout(() => setCopied((c) => (c === number ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
    if (open) {
      setReceiver(correcting?.receiveService && correcting.receiveNumber ? `${correcting.receiveService}:${correcting.receiveNumber}` : '');
      // A number kept before the eight-digit rule may carry +222 (or 00222): shown without it, never cut.
      setPayer(payerInput((correcting?.payerPhone ?? '').replace(/^222(?=\d{8}$)/, '+222')));
      setFile(null);
      setCopied(null);
      setProblem(null);
      setError(null);
      key.current = newKey();
    }
  }, [open]);

  // One save, one request: Enter pressed twice, or Enter then a click, before the button is disabled sends nothing more.
  const sending = useRef(false);
  const pasted = useRef(false);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (sending.current) return;
    setProblem(null);
    setError(null);
    const [service, number] = receiver.split(':');
    if (!service || !number) return setProblem('pay.problem.receiver');
    if (!/^\d{8}$/.test(payer)) return setProblem('portal.store.problem.payer');
    if (!correcting && !file) return setProblem('portal.proof.problem.file');
    if (file && file.size > MAX_BYTES) return setProblem('portal.proof.problem.size');
    const body = new FormData();
    body.set('receiveService', service);
    body.set('receiveNumber', number);
    body.set('payerPhone', payer);
    if (file) body.set('file', file);
    sending.current = true;
    setBusy(true);
    try {
      if (correcting) {
        body.set('revision', String(correcting.revision ?? 1));
        await ownerRequest(`platform/my-subscription/payment-proofs/${correcting.id}/correct`, { method: 'POST', body });
      } else {
        body.set('idempotencyKey', key.current);
        body.set('category', action === 'seat' ? 'extra_seats' : action === 'activate' ? 'store_activation' : 'subscription');
        body.set('months', String(months));
        body.set('branches', branches.join(','));
        if (action === 'seat') body.set('seats', '1');
        await ownerRequest('platform/my-subscription/payment-proofs', { method: 'POST', body });
      }
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="modal pay-window" onCancel={onClose} aria-labelledby="pay-window-h">
      {open ? (
        <form className="body stack" onSubmit={send}>
          <div className="row spread">
            <h2 id="pay-window-h">{correcting ? t('pay.window.correct') : t('pay.window.title')}</h2>
            <Money amount={correcting ? Number(correcting.amount) : total} />
          </div>
          <p className="muted small">{t('pay.window.send')}</p>
          {receivers.length ? (
            <fieldset className="pay-receivers">
              <legend>{t('pay.window.where')}</legend>
              {receivers.map((r) => {
                const id = `${r.service}:${r.number}`;
                return (
                  <div key={id} className={receiver === id ? 'pay-receiver on' : 'pay-receiver'}>
                    <label className="pay-receiver-choice">
                      <input type="radio" name="receiver" value={id} checked={receiver === id} onChange={(e) => setReceiver(e.target.value)} />
                      <strong>{r.label}</strong>
                      <span className="ltr" dir="ltr">
                        {spaced(r.number)}
                      </span>
                    </label>
                    <button type="button" className="pay-copy" aria-label={t('pay.copyNumber', { number: spaced(r.number) })} title={t('pay.copyNumber', { number: spaced(r.number) })} onClick={() => void copy(r.number)}>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                      <span aria-live="polite">{copied === r.number ? t('portal.pay.copied') : ''}</span>
                    </button>
                  </div>
                );
              })}
            </fieldset>
          ) : (
            <Notice tone="info">{t('account.payment.none')}</Notice>
          )}
          <label className="field">
            {t('portal.store.payer')}
            <input
              inputMode="numeric"
              autoComplete="tel-national"
              dir="ltr"
              value={payer}
              aria-describedby="pay-payer-hint"
              onPaste={() => {
                pasted.current = true;
              }}
              onChange={(e) => {
                // Typed: no more than eight digits are taken. Pasted: +222 and separators dropped; a pasted number
                // that is still too long stays as pasted (never cut) and the form says it is wrong.
                const next = payerInput(e.target.value);
                const fromPaste = pasted.current;
                pasted.current = false;
                if (!fromPaste && next.length > 8 && next.length > payer.length) return;
                setPayer(next);
              }}
            />
            <span id="pay-payer-hint" className="muted small">
              {t('pay.payer.hint')}
            </span>
          </label>
          <div className="field">
            <span id="pay-file-label">{correcting ? t('portal.store.replaceScreenshot') : t('portal.store.screenshot')}</span>
            <div className="pay-upload">
              <input
                ref={fileInput}
                id="pay-file"
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                aria-labelledby="pay-file-label"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" className="btn" aria-describedby="pay-file-name" onClick={() => fileInput.current?.click()}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
                </svg>
                {file ? t('pay.file.change') : t('pay.file.choose')}
              </button>
              <span id="pay-file-name" className={file ? 'pay-file-name' : 'pay-file-name muted'} dir="auto">
                {file ? file.name : t('pay.file.none')}
              </span>
            </div>
            <span className="muted small">{t('pay.file.types')}</span>
          </div>
          {problem ? <Notice tone="danger">{t(problem)}</Notice> : null}
          <ErrorNotice error={error} />
          <p className="muted small">{t('pay.window.after')}</p>
          <div className="pay-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || receivers.length === 0}>
              {correcting ? t('portal.store.saveCorrection') : t('portal.store.send')}
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

/**
 * A new store that takes over the month of one closed during this paid month (D158): the server names the store it
 * replaces and what is due now — the difference between the two activities, or nothing. The page does no arithmetic.
 */
export function ReplacementNote({ option }: { option: NewStoreOption | null }) {
  const { t, lang } = useI18n();
  if (!option?.replaces || typeof option.dueNow !== 'number') return null;
  return option.dueNow === 0 ? (
    <Notice tone="info">{t('account.requests.store.replacesFree', { store: option.replaces.name })}</Notice>
  ) : (
    <Notice tone="info">{t('account.requests.store.replaces', { store: option.replaces.name, amount: formatMru(option.dueNow, lang) })}</Notice>
  );
}
