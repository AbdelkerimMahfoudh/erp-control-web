import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ApiError, request } from '../api/client';
import type { AcquisitionLookup } from '../api/types';
import { useI18n } from '../i18n';
import { Notice } from './ui';

/**
 * The registration's optional source (0103, D221): a promoter's six-digit promo code, or the registration link the
 * person arrived with — a promoter's QR card or a user's invitation. At most one goes with the registration, and the
 * server checks it again when the business is created.
 *
 * The code is typed in six boxes, left to right in every language (`dir="ltr"`: an Arabic page never reverses the
 * digits). Arabic-Indic and Eastern Arabic-Indic digits are read as the digits they are; a pasted code fills every box;
 * typing moves on, Backspace moves back. Six digits are checked at once: the promoter's display name, or one unavailable
 * answer. The source can always be removed: it is where the person heard of Dukan ERP, and nothing more.
 */

export type AcquisitionClaim = { promoCode: string } | { referralToken: string } | null;

const LENGTH = 6;

/** Arabic-Indic (U+0660–0669) and Eastern Arabic-Indic (U+06F0–06F9) digits as ASCII; everything else dropped. */
export function digitsOf(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0x0f)).replace(/[^0-9]/g, '');
}

type Lookup = { kind: 'idle' } | { kind: 'checking' } | { kind: 'usable'; name: string } | { kind: 'unavailable' } | { kind: 'limited'; message: string };

/** Ask the server about one complete code. One answer for every unusable code. */
async function lookupCode(code: string): Promise<Lookup> {
  try {
    const a = await request<AcquisitionLookup>('platform/acquisition/code', { method: 'POST', body: { code } });
    return a.usable && a.source === 'promoter' ? { kind: 'usable', name: a.promoterName } : { kind: 'unavailable' };
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) return { kind: 'limited', message: e.message };
    return { kind: 'unavailable' };
  }
}

export function PromoCodeBoxes({ value, onChange, disabled }: { value: string; onChange: (code: string) => void; disabled?: boolean }) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('');

  const put = (from: number, typed: string) => {
    const incoming = digitsOf(typed);
    if (!incoming) return;
    const next = (value.slice(0, from) + incoming).slice(0, LENGTH);
    onChange(next);
    refs.current[Math.min(next.length, LENGTH - 1)]?.focus();
  };

  const key = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const at = digits[i] !== ' ' ? i : Math.max(0, i - 1);
      onChange(value.slice(0, at));
      refs.current[at]?.focus();
    } else if (e.key === 'ArrowLeft') refs.current[Math.max(0, i - 1)]?.focus();
    else if (e.key === 'ArrowRight') refs.current[Math.min(LENGTH - 1, i + 1)]?.focus();
  };

  const paste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    put(Math.min(i, value.length), e.clipboardData.getData('text'));
  };

  return (
    <div className="code-boxes" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(n) => {
            refs.current[i] = n;
          }}
          className="code-box"
          inputMode="numeric"
          autoComplete={i === 0 ? 'off' : undefined}
          maxLength={LENGTH}
          aria-label={t('promo.digit', { n: i + 1 })}
          value={d === ' ' ? '' : d}
          disabled={disabled}
          onChange={(e) => put(Math.min(i, value.length), e.target.value)}
          onKeyDown={key(i)}
          onPaste={paste(i)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

/**
 * The whole optional source, as the registration form shows it. `arrived` is the token of the registration link the
 * person came with, if any — held in memory by the caller, never in the address. `onClaim` hears the one source the
 * registration should carry, or null; `onBusy` whether a check is still running, so the form waits for it.
 */
export function AcquisitionField({ arrived, onClaim, onBusy, disabled }: { arrived: string | null; onClaim: (c: AcquisitionClaim) => void; onBusy?: (busy: boolean) => void; disabled?: boolean }) {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(arrived);
  const [link, setLink] = useState<AcquisitionLookup | null>(null);
  const [linkChecked, setLinkChecked] = useState(arrived === null);
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<Lookup>({ kind: 'idle' });
  /** The code the QR card prefilled: kept as the QR's own source until the person changes it. */
  const [prefilled, setPrefilled] = useState<string | null>(null);

  // The link the person arrived with: what it is, or a short notice and the ordinary registration.
  useEffect(() => {
    if (!arrived) return;
    let live = true;
    request<AcquisitionLookup>('platform/acquisition/link', { method: 'POST', body: { token: arrived } })
      .then((a) => {
        if (!live) return;
        setLink(a);
        if (!a.usable) setToken(null);
        else if (a.source === 'promoter') {
          setCode(a.code);
          setPrefilled(a.code);
          setLookup({ kind: 'usable', name: a.promoterName });
        }
      })
      .catch(() => live && (setLink({ usable: false }), setToken(null)))
      .finally(() => live && setLinkChecked(true));
    return () => {
      live = false;
    };
  }, [arrived]);

  // Six digits are checked at once — except the QR's own, already answered.
  useEffect(() => {
    if (code.length < LENGTH) {
      setLookup((l) => (l.kind === 'idle' ? l : { kind: 'idle' }));
      return;
    }
    if (code === prefilled) return;
    let live = true;
    setLookup({ kind: 'checking' });
    void lookupCode(code).then((l) => live && setLookup(l));
    return () => {
      live = false;
    };
  }, [code, prefilled]);

  const invitation = token !== null && link?.usable === true && link.source === 'user_invite';
  const qr = token !== null && prefilled !== null && code === prefilled;
  const typedUsable = lookup.kind === 'usable' && !qr;
  const choosing = invitation && typedUsable;

  useEffect(() => onBusy?.(!linkChecked || lookup.kind === 'checking' || choosing), [linkChecked, lookup.kind, choosing, onBusy]);
  useEffect(() => {
    if (qr || (invitation && !typedUsable)) onClaim({ referralToken: token! });
    else if (typedUsable) onClaim({ promoCode: code });
    else onClaim(null);
  }, [qr, invitation, typedUsable, token, code, onClaim]);

  const removeCode = () => {
    setCode('');
    setLookup({ kind: 'idle' });
    if (qr) setToken(null);
    setPrefilled(null);
  };
  const keepInvitation = () => removeCode();
  const keepCode = () => setToken(null);

  return (
    <fieldset className="promo stack-tight" disabled={disabled}>
      <legend>{t('promo.label')}</legend>
      {link && !link.usable ? <Notice tone="warn">{t('promo.linkInvalid')}</Notice> : null}
      {invitation ? (
        <div className="row spread">
          <Notice tone="ok">{t('promo.invited')}</Notice>
          {!choosing ? (
            <button type="button" className="btn btn-sm" onClick={() => setToken(null)}>
              {t('promo.invited.remove')}
            </button>
          ) : null}
        </div>
      ) : null}
      <span className="hint">{t('promo.hint')}</span>
      <PromoCodeBoxes value={code} onChange={(c) => (setCode(c), c !== prefilled && setPrefilled(null), qr && c !== prefilled && setToken(null))} disabled={disabled} />
      <div aria-live="polite" className="stack-tight">
        {lookup.kind === 'checking' ? <p className="muted small">{t('promo.checking')}</p> : null}
        {lookup.kind === 'usable' ? <Notice tone="ok">{t('promo.from', { name: lookup.name })}</Notice> : null}
        {lookup.kind === 'unavailable' ? <Notice tone="warn">{t('promo.unavailable')}</Notice> : null}
        {lookup.kind === 'limited' ? <Notice tone="warn">{lookup.message}</Notice> : null}
      </div>
      {code ? (
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={removeCode}>
            {t('promo.remove')}
          </button>
        </div>
      ) : null}
      {choosing ? (
        <div className="card stack-tight" role="group" aria-labelledby="promo-choose">
          <strong id="promo-choose">{t('promo.choose.title')}</strong>
          <p className="muted small">{t('promo.choose.body')}</p>
          <div className="row">
            <button type="button" className="btn" onClick={keepInvitation}>
              {t('promo.choose.invite')}
            </button>
            <button type="button" className="btn" onClick={keepCode}>
              {t('promo.choose.code')}
            </button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
