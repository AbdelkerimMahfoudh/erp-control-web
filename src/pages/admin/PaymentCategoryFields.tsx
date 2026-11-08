import { useEffect, useState } from 'react';
import { adminRequest } from '../../auth/admin';
import { PAYMENT_CATEGORIES, type PaymentCategory, type PaymentPrice, type StoreStatus } from '../../api/types';
import { Field, Money } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';

/** What the administrator picks on Record payment (0134, owner 2026-11-08). */
export interface CategoryChoice {
  category: PaymentCategory;
  months: number;
  branches: string[];
  seats: number;
}

export const DEFAULT_CHOICE: CategoryChoice = { category: 'subscription', months: 1, branches: [], seats: 1 };

/** The body fields a categorised payment sends; the amount is the server's price (an adjustment states its own). */
export function categoryBody(c: CategoryChoice): Record<string, unknown> {
  if (c.category === 'other') return { category: 'other' };
  return {
    category: c.category,
    months: c.months,
    ...(c.branches.length ? { branches: c.branches } : {}),
    ...(c.category === 'extra_seats' ? { seats: c.seats } : {}),
  };
}

/**
 * The category, its months, stores and seats — and the server's price for them, filled into the amount. Only an
 * adjustment (`other`) lets the administrator type the amount; it then needs its note (the form's own note field).
 */
export function PaymentCategoryFields({
  businessId,
  stores,
  choice,
  onChoice,
  onPrice,
}: {
  businessId: string;
  stores: StoreStatus[];
  choice: CategoryChoice;
  onChoice: (c: CategoryChoice) => void;
  onPrice: (amount: string | null) => void;
}) {
  const { t, lang } = useI18n();
  const [price, setPrice] = useState<PaymentPrice | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setFailed(null);
    if (choice.category === 'other') {
      setPrice(null);
      onPrice(null);
      return () => {
        live = false;
      };
    }
    const q = new URLSearchParams({ category: choice.category, months: String(choice.months) });
    if (choice.branches.length) q.set('branches', choice.branches.join(','));
    if (choice.category === 'extra_seats') q.set('seats', String(choice.seats));
    adminRequest<{ price: PaymentPrice | null }>(`platform/businesses/${businessId}/payment-price?${q.toString()}`)
      .then((r) => {
        if (!live) return;
        setPrice(r.price);
        onPrice(r.price ? String(r.price.total) : null);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setPrice(null);
        onPrice('');
        setFailed(e instanceof Error ? e.message : t('payment.price.unavailable'));
      });
    return () => {
      live = false;
    };
    // onPrice is the parent's setter; the price depends on the choice only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, choice.category, choice.months, choice.seats, choice.branches.join(',')]);

  const name = (s: StoreStatus) => (lang === 'ar' && s.nameAr ? s.nameAr : s.name);
  const toggle = (id: string) =>
    onChoice({
      ...choice,
      branches: choice.category === 'extra_seats' ? [id] : choice.branches.includes(id) ? choice.branches.filter((b) => b !== id) : [...choice.branches, id],
    });

  return (
    <div className="stack">
      <div className="grid">
        <Field label={t('payment.category')}>
          <select value={choice.category} onChange={(e) => onChoice({ ...DEFAULT_CHOICE, category: e.target.value as PaymentCategory })}>
            {PAYMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`payment.category.${c}` as Key)}
              </option>
            ))}
          </select>
        </Field>
        {choice.category !== 'other' ? (
          <Field label={t('payment.months')}>
            <select value={choice.months} onChange={(e) => onChoice({ ...choice, months: Number(e.target.value) })}>
              {[1, 3, 12].map((m) => (
                <option key={m} value={m}>
                  {t('payment.months.n', { n: String(m) })}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {choice.category === 'extra_seats' ? (
          <Field label={t('payment.seats')}>
            <input type="number" min={1} max={50} value={choice.seats} onChange={(e) => onChoice({ ...choice, seats: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} />
          </Field>
        ) : null}
      </div>
      {choice.category === 'subscription' || choice.category === 'extra_seats' ? (
        <Field label={choice.category === 'extra_seats' ? t('payment.store.one') : t('payment.stores')} hint={choice.category === 'subscription' ? t('payment.stores.allHint') : undefined}>
          <div className="stack">
            {stores.map((s) => (
              <label key={s.branchId} className="row">
                <input
                  type={choice.category === 'extra_seats' ? 'radio' : 'checkbox'}
                  name="payment-store"
                  className="checkbox-inline"
                  checked={choice.branches.includes(s.branchId)}
                  onChange={() => toggle(s.branchId)}
                />
                {name(s)}
              </label>
            ))}
          </div>
        </Field>
      ) : null}
      {choice.category === 'store_activation' ? <p className="muted small">{t('payment.activation.hint')}</p> : null}
      {choice.category === 'other' ? <p className="muted small">{t('payment.other.hint')}</p> : null}
      {price ? (
        <p>
          {t('payment.price.server')}: <Money amount={price.total} />
        </p>
      ) : null}
      {failed ? <p className="muted small">{failed}</p> : null}
    </div>
  );
}
