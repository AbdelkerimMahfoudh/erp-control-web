import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DEMO_FIGURES, DEMO_PROVIDERS, dukanDemo, type DukanDemo } from '../../content/dukan-demo';
import { useI18n } from '../../i18n';
import type { Language } from '../../i18n/languages';
import { formatInt, formatMru } from '../../lib/format';
import { usePrefersReducedMotion } from '../../lib/motion';
import { Icon } from './icons';
import { RichText } from './RichText';

/**
 * The Dukan ERP showcase (the owner's approval of 2026-10-18): a phone walking through one ordinary operation of each
 * activity in three steps — a phone sold in an electronics store, an exchange at a money-service agent's counter. On
 * the home page's product card and on the product page; one component, its words in `content/dukan-demo.ts`.
 *
 * It is an illustration and behaves as one:
 *  - nothing is typed into it and nothing leaves the page — no request, no storage, no camera, no tracking. Its
 *    figures are fixed and fictional, and it says so under the phone;
 *  - it moves only when asked. Play walks through the three steps once, `STEP_MS` each, and stops on the result;
 *    choosing a step, an activity or a direction stops it there. It pauses when its phone leaves the screen or the
 *    page is hidden, and does not start again by itself. With reduced motion there is no Play at all (public.css),
 *    only the steps, chosen one by one;
 *  - one timer at most, in one effect, cleared whenever the step, the activity or the play state changes;
 *  - every step's screen is drawn in the same place, so the showcase keeps one height whichever step, activity or
 *    language is shown. The hidden ones are out of sight for everybody: invisible, and inert for the keyboard;
 *  - the prerendered page already shows the first step of the electronics walkthrough, so it reads without a script.
 */
type Activity = 'electronics' | 'agent';
type Direction = 'receiveCash' | 'giveCash';

const ACTIVITIES: Activity[] = ['electronics', 'agent'];
const DIRECTIONS: Direction[] = ['receiveCash', 'giveCash'];
const STEPS = [0, 1, 2] as const;
const LAST = STEPS.length - 1;
/** How long each step stays on screen while the walkthrough plays (`--sc-step` in public.css is the same). */
export const STEP_MS = 2800;

export function DukanShowcase() {
  const { lang } = useI18n();
  const d = dukanDemo[lang];
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const [activity, setActivity] = useState<Activity>('electronics');
  const [direction, setDirection] = useState<Direction>('receiveCash');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tabs = useRef<Partial<Record<Activity, HTMLButtonElement | null>>>({});
  const phones = useRef<Partial<Record<Activity, HTMLDivElement | null>>>({});

  // One step forward every STEP_MS while playing; the last step is the result, and the walkthrough stops on it.
  useEffect(() => {
    if (!playing || step >= LAST) return;
    const timer = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 1 >= LAST) setPlaying(false);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step]);

  // While playing only: pause when the phone leaves the screen or the page is hidden.
  useEffect(() => {
    if (!playing) return;
    const pause = () => setPlaying(false);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const phone = phones.current[activity];
    const io =
      phone && 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            if (entries.some((e) => !e.isIntersecting)) pause();
          })
        : null;
    if (phone) io?.observe(phone);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
    };
  }, [playing, activity]);

  // Reduced motion switched on while the walkthrough plays: it stops where it is.
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  const choose = (next: Activity) => {
    setActivity(next);
    setStep(0);
    setPlaying(false);
  };
  const turn = (next: Direction) => {
    setDirection(next);
    setStep(0);
    setPlaying(false);
  };
  const select = (next: number) => {
    setStep(next);
    setPlaying(false);
  };
  const toggle = () => {
    if (playing) return setPlaying(false);
    if (reduced) return;
    if (step >= LAST) setStep(0);
    setPlaying(true);
  };
  const control = playing ? 'pause' : step >= LAST ? 'replay' : 'play';

  // The tabs' arrow keys follow the page's direction — in Arabic the next tab is to the left — and, where the two tabs
  // are stacked on a narrow screen, down and up.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const rtl = e.currentTarget.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const at = ACTIVITIES.indexOf(activity);
    const moves: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 };
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? ACTIVITIES.length - 1 : e.key in moves ? (at + moves[e.key]! + ACTIVITIES.length) % ACTIVITIES.length : null;
    if (next === null) return;
    e.preventDefault();
    const target = ACTIVITIES[next]!;
    if (target !== activity) choose(target);
    tabs.current[target]?.focus();
  };

  return (
    <div className="showcase">
      <div className="sc-tabs" role="tablist" aria-label={d.tabsLabel}>
        {ACTIVITIES.map((a) => (
          <button
            key={a}
            ref={(el) => {
              tabs.current[a] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${a}`}
            className="sc-tab"
            aria-selected={a === activity}
            aria-controls={`${id}-panel-${a}`}
            tabIndex={a === activity ? 0 : -1}
            onClick={() => choose(a)}
            onKeyDown={onTabKey}
          >
            <Icon name={a === 'electronics' ? 'store' : 'swap'} size={18} />
            <span>{d[a].tab}</span>
          </button>
        ))}
      </div>

      <div className="sc-panels">
        {ACTIVITIES.map((a) => {
          const on = a === activity;
          const current = on ? step : 0;
          const screenId = `${id}-screen-${a}`;
          return (
            <div key={a} role="tabpanel" id={`${id}-panel-${a}`} aria-labelledby={`${id}-tab-${a}`} className="sc-panel" data-on={on} inert={!on}>
              <div className="sc-stage">
                <div
                  className="pv-phone sc-phone"
                  ref={(el) => {
                    phones.current[a] = el;
                  }}
                >
                  <div className="pv-screen sc-screen">
                    <div className="pv-status" aria-hidden="true">
                      <span className="num">09:41</span>
                      <span>●●●</span>
                    </div>
                    <div className="sc-frames" id={screenId} role="group" aria-label={d.screenLabel}>
                      {STEPS.map((s) => (
                        <div key={s} className="sc-frame" data-on={s === current} aria-hidden={s !== current}>
                          {a === 'electronics' ? <SaleScreen step={s} d={d} lang={lang} /> : <ExchangeScreen step={s} d={d} lang={lang} direction={direction} />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn sc-play" aria-controls={screenId} onClick={toggle}>
                  <Icon name={control} size={16} />
                  <span>{d[control]}</span>
                </button>
              </div>

              <div className="sc-side">
                {a === 'agent' ? (
                  <div className="sc-direction" role="group" aria-labelledby={`${id}-direction`}>
                    <span id={`${id}-direction`} className="sc-direction-label">
                      {d.agent.directionLabel}
                    </span>
                    {DIRECTIONS.map((way) => (
                      <button key={way} type="button" className="sc-direction-choice" aria-pressed={way === direction} onClick={() => turn(way)}>
                        <Icon name="swap" size={16} />
                        <span>{d.agent[way]}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <ol className="sc-steps" aria-label={d.stepsLabel}>
                  {d[a].steps.map((item, i) => (
                    <li key={item.title} className="sc-step" data-on={i === current} data-playing={on && playing && i === current ? '' : undefined}>
                      <button type="button" aria-current={i === current ? 'step' : undefined} aria-controls={screenId} aria-describedby={`${id}-${a}-step-${i}`} onClick={() => select(i)}>
                        <span className="sc-step-num num">{formatInt(i + 1, lang)}</span>
                        <span className="sc-step-title">
                          <RichText text={item.title} />
                        </span>
                      </button>
                      <p id={`${id}-${a}-step-${i}`}>
                        <RichText text={item.body} />
                      </p>
                      <span className="sc-progress" aria-hidden="true" />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}
      </div>

      <p className="sc-note">{d.note}</p>
    </div>
  );
}

/** An amount in MRU, kept in its own direction inside Arabic. */
function Mru({ amount, lang }: { amount: number; lang: Language }) {
  return (
    <bdi dir="ltr" className="num">
      {formatMru(amount, lang)}
    </bdi>
  );
}

/** A value that is a name or an identifier, read left to right in every language. */
function Ltr({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sc-row">
      <dt>
        {label}
        {hint ? <small>{hint}</small> : null}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function Done({ text }: { text: string }) {
  return (
    <p className="sc-done">
      <Icon name="check-circle" size={20} />
      <strong>{text}</strong>
    </p>
  );
}

/** The phone sold in an electronics store: chosen, paid, recorded. */
function SaleScreen({ step, d, lang }: { step: number; d: DukanDemo; lang: Language }) {
  const e = d.electronics;
  const item = (
    <div className="sc-item">
      <span className="sc-item-ic">
        <Icon name="phone" size={18} />
      </span>
      <div>
        <b>{e.product}</b>
        <small>
          {e.variant} · <Ltr>IMEI {DEMO_FIGURES.imei}</Ltr>
        </small>
      </div>
      {step === LAST ? <span className="sc-chip">{e.sold}</span> : null}
    </div>
  );
  if (step === 0)
    return (
      <>
        <p className="sc-title">{e.newSale}</p>
        <p className="sc-search">
          <Icon name="scan" size={16} />
          <span>{e.scan}</span>
        </p>
        {item}
        <dl className="sc-rows">
          <Row label={e.price}>
            <Mru amount={DEMO_FIGURES.salePrice} lang={lang} />
          </Row>
        </dl>
        <span className="sc-chip sc-chip-ok">{e.inStock}</span>
      </>
    );
  if (step === 1)
    return (
      <>
        <p className="sc-title">{e.payment}</p>
        <dl className="sc-rows">
          <Row label={e.saleAmount}>
            <Mru amount={DEMO_FIGURES.salePrice} lang={lang} />
          </Row>
          <Row label={e.received}>
            <Mru amount={DEMO_FIGURES.salePrice} lang={lang} />
          </Row>
        </dl>
        <div className="sc-field">
          <small>{e.method}</small>
          <div className="sc-options">
            <span className="sc-option" data-on="true">
              {e.cash}
            </span>
            <span className="sc-option">
              <Ltr>{DEMO_PROVIDERS[1]}</Ltr>
            </span>
          </div>
        </div>
        <span className="sc-chip sc-chip-ok">{e.paidInFull}</span>
      </>
    );
  return (
    <>
      <Done text={e.recorded} />
      {item}
      <dl className="sc-rows">
        <Row label={e.method}>{e.cash}</Row>
        <Row label={e.received}>
          <Mru amount={DEMO_FIGURES.salePrice} lang={lang} />
        </Row>
      </dl>
      <div className="sc-summary">
        <small>{e.today}</small>
        <dl className="sc-rows">
          <Row label={e.sales}>
            <span className="num">{formatInt(1, lang)}</span>
          </Row>
          <Row label={e.amount}>
            <Mru amount={DEMO_FIGURES.salePrice} lang={lang} />
          </Row>
        </dl>
      </div>
    </>
  );
}

/**
 * The exchange at a money-service agent's counter: provider and direction, amount and commission, recorded. The amount
 * and the commission are always shown apart, and no balance is drawn: how each leg moves the drawer and the float is
 * the app's to show (D164), not an illustration's.
 */
function ExchangeScreen({ step, d, lang, direction }: { step: number; d: DukanDemo; lang: Language; direction: Direction }) {
  const g = d.agent;
  const provider = <Ltr>{DEMO_PROVIDERS[0]}</Ltr>;
  if (step === 0)
    return (
      <>
        <p className="sc-title">{g.newExchange}</p>
        <div className="sc-field">
          <small>{g.provider}</small>
          <div className="sc-options">
            {DEMO_PROVIDERS.map((p, i) => (
              <span key={p} className="sc-option" data-on={i === 0}>
                <Ltr>{p}</Ltr>
              </span>
            ))}
          </div>
        </div>
        <div className="sc-field">
          <small>{g.directionLabel}</small>
          <div className="sc-options sc-options-stack">
            {DIRECTIONS.map((way) => (
              <span key={way} className="sc-option" data-on={way === direction}>
                {g[way]}
              </span>
            ))}
          </div>
        </div>
      </>
    );
  if (step === 1)
    return (
      <>
        <p className="sc-title">{g.newExchange}</p>
        <p className="sc-context">
          {provider} · {g[direction]}
        </p>
        <dl className="sc-rows">
          <Row label={g.amount}>
            <Mru amount={DEMO_FIGURES.exchangeAmount} lang={lang} />
          </Row>
          <Row label={g.commission} hint={g.commissionHint}>
            <Mru amount={DEMO_FIGURES.commission} lang={lang} />
          </Row>
          <Row label={g.operator} hint={g.fromSignIn}>
            <span className="sc-locked">
              <Icon name="lock" size={14} />
              {g.demoOperator}
            </span>
          </Row>
        </dl>
        <p className="sc-fine">{g.example}</p>
      </>
    );
  return (
    <>
      <Done text={g.recorded} />
      <p className="sc-context">
        {provider} · {g[direction]}
      </p>
      <dl className="sc-rows">
        <Row label={g.amount}>
          <Mru amount={DEMO_FIGURES.exchangeAmount} lang={lang} />
        </Row>
      </dl>
      <dl className="sc-rows sc-commission">
        <Row label={g.commission}>
          <Mru amount={DEMO_FIGURES.commission} lang={lang} />
        </Row>
      </dl>
      <div className="sc-summary">
        <small>{g.today}</small>
        <dl className="sc-rows">
          <Row label={g.exchanges}>
            <span className="num">{formatInt(1, lang)}</span>
          </Row>
          <Row label={g.commissionEarned}>
            <Mru amount={DEMO_FIGURES.commission} lang={lang} />
          </Row>
        </dl>
      </div>
    </>
  );
}
