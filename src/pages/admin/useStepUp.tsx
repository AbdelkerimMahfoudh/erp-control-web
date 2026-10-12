import { useCallback, useRef, useState } from 'react';
import { StepUpDialog } from '../../components/StepUpDialog';
import { adminStepUp } from '../../auth/admin';

/**
 * Ask for the administrator's password and a code, once per decision (0094). The pair is checked by the server
 * first — which records the step-up on this session — and only then is the password handed to the request that
 * needs it. A wrong pair keeps the dialog open with the reason; nothing is kept between decisions.
 */
export function useStepUp() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const resolver = useRef<((password: string | null) => void) | null>(null);

  const ask = useCallback((): Promise<string | null> => {
    setError(null);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: string | null) => {
    setOpen(false);
    setBusy(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  const submit = async (password: string, code: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminStepUp(password, code);
      settle(password);
    } catch (e) {
      setBusy(false);
      setError(e);
    }
  };

  const dialog = <StepUpDialog open={open} busy={busy} error={error} onSubmit={(pw, code) => void submit(pw, code)} onCancel={() => settle(null)} />;
  return { ask, dialog };
}
