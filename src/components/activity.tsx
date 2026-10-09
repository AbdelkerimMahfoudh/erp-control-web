import type { Activity, ActivityPrices } from '../api/types';
import { useI18n, type Key } from '../i18n';
import { activityPrice } from '../lib/activity';
import { Money } from './ui';

/** An activity in words. */
export function ActivityName({ activity }: { activity: Activity }) {
  const { t } = useI18n();
  return <>{t(`activity.${activity}` as Key)}</>;
}

/** A branch's activity, and the change waiting for the next renewal when there is one. Nothing when the server sent none. */
export function ActivityWithNext({ activity, next }: { activity?: Activity | null; next?: Activity | null }) {
  const { t } = useI18n();
  if (!activity) return <>—</>;
  return (
    <span className="stack-tight">
      <span>{t(`activity.${activity}` as Key)}</span>
      {next ? <span className="muted small">{t('activity.next', { activity: t(`activity.${next}` as Key) })}</span> : null}
    </span>
  );
}

function CardBody({ activity, prices }: { activity: Activity; prices: ActivityPrices | null | undefined }) {
  const { t } = useI18n();
  const price = activityPrice(prices, activity);
  return (
    <>
      {price !== null ? (
        <span className="choice-price">
          <Money amount={price} /> <span className="muted small">{t('activity.perMonth')}</span>
        </span>
      ) : null}
      <span className="muted small">{t(`activity.${activity}.body` as Key)}</span>
    </>
  );
}

/**
 * The activities as large cards to choose from, each with the plan's monthly
 * price (shown only when the server sent it) and one plain sentence. A native
 * radio in every card, so the choice reads by shape and words, never by colour
 * alone; the grid wraps to one column on a narrow screen.
 */
export function ActivityCards({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  prices,
  labelOf,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: readonly Activity[];
  value: Activity | null;
  onChange: (a: Activity) => void;
  prices: ActivityPrices | null | undefined;
  /** A card title other than the activity's name (e.g. "Keep …"). */
  labelOf?: (a: Activity) => string | null;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="choice-fieldset">
      <legend>{legend}</legend>
      {hint ? <p className="muted small">{hint}</p> : null}
      <div className="choice-grid">
        {options.map((a) => (
          <label key={a} className={`choice-card${value === a ? ' selected' : ''}`}>
            <span className="choice-head">
              <input type="radio" name={name} value={a} checked={value === a} onChange={() => onChange(a)} />
              <strong>{labelOf?.(a) ?? t(`activity.${a}` as Key)}</strong>
            </span>
            <CardBody activity={a} prices={prices} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The same cards, to read: the public price list. Only the activities the server priced. */
export function ActivityPriceCards({ prices }: { prices: ActivityPrices }) {
  const { t } = useI18n();
  const priced = (['electronics', 'money_agent', 'both'] as const).filter((a) => activityPrice(prices, a) !== null);
  return (
    <div className="choice-grid">
      {priced.map((a) => (
        <div key={a} className="choice-card static">
          <strong>{t(`activity.${a}` as Key)}</strong>
          <CardBody activity={a} prices={prices} />
        </div>
      ))}
    </div>
  );
}
