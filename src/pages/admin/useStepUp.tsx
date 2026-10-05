import { useCallback, useRef, useState } from 'react';
import { StepUpDialog } from '../../components/StepUpDialog';

/**
 * Ask for the administrator's password, once per decision, and hand it to the
 * request that needs it. The password is never kept between decisions.
 */
export function useStepUp() {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((password: string | null) => void) | null>(null);

  const ask = useCallback((): Promise<string | null> => {
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: string | null) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  const dialog = <StepUpDialog open={open} onSubmit={(pw) => settle(pw)} onCancel={() => settle(null)} />;
  return { ask, dialog };
}
