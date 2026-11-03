import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { StepUpDialog } from '../../components/StepUpDialog';
import { adminStepUp, adminStepUpWindow, stepUpEvents } from '../../auth/admin';
import { useI18n } from '../../i18n';

/**
 * The step-up window (0094; post-Build-4, the owner's decision of 2026-11-03): the password and a code from the
 * authenticator open five absolute minutes on this session, recorded and enforced by the server. While they run, every
 * decision goes ahead without asking again — the server checks the window on each one — and the header counts down
 * what is left. Nothing is kept here but the window's end: never the password, never the code.
 */

let windowEnd: number | null = null;
const listeners = new Set<() => void>();
const publish = (end: number | null) => {
  windowEnd = end;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** A refusal for want of a window (it ended on the server first): the next decision asks again. */
export function forgetStepUpWindow() {
  publish(null);
}

stepUpEvents.required = forgetStepUpWindow;

/** The server's own answer, read once a page opens: a window opened earlier in this session is reused. */
export async function refreshStepUpWindow(): Promise<void> {
  try {
    const { expiresAt } = await adminStepUpWindow();
    publish(expiresAt ? Date.parse(expiresAt) : null);
  } catch {
    publish(null);
  }
}

/** A little before its end, so a decision is never sent with a window about to close on the way. */
const MARGIN_MS = 3_000;
const isOpen = (now = Date.now()) => windowEnd !== null && now < windowEnd - MARGIN_MS;

export function useStepUp() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  /** True once the window is open — at once when it already is — false when the administrator cancels. */
  const ask = useCallback((): Promise<boolean> => {
    if (isOpen()) return Promise.resolve(true);
    setError(null);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    setOpen(false);
    setBusy(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const submit = async (password: string, code: string) => {
    setBusy(true);
    setError(null);
    try {
      const { expiresAt } = await adminStepUp(password, code);
      publish(Date.parse(expiresAt));
      settle(true);
    } catch (e) {
      setBusy(false);
      setError(e);
    }
  };

  const dialog = <StepUpDialog open={open} busy={busy} error={error} onSubmit={(pw, code) => void submit(pw, code)} onCancel={() => settle(false)} />;
  return { ask, dialog };
}

/** "Verified for 4:32": the time left in the window, from the server's end, gone when it ends. */
export function StepUpIndicator() {
  const { t } = useI18n();
  const end = useSyncExternalStore(subscribe, () => windowEnd);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    void refreshStepUpWindow();
  }, []);
  useEffect(() => {
    if (end === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [end]);
  if (end === null || now >= end) return null;
  const left = Math.max(0, Math.ceil((end - now) / 1_000));
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span className="badge tone-ok" role="status" aria-live="off" data-testid="step-up-window">
      {t('admin.stepup.verifiedFor', { time })}
    </span>
  );
}
