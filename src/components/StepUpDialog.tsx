import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { ErrorNotice } from './ui';

/**
 * Step-up for administrator decisions (0094): the password and a fresh code from the authenticator. Neither is kept:
 * the pair is checked by the server, which opens five absolute minutes on this session; while they run, no decision
 * asks again (post-Build-4, `useStepUp`), and the password is never sent with a decision.
 */
export function StepUpDialog({
  open,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  busy?: boolean;
  error?: unknown;
  onSubmit: (password: string, code: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) {
      setPassword('');
      setCode('');
    }
  }, [open]);
  const ready = password !== '' && /^\d{6}$/.test(code);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready && !busy) onSubmit(password, code);
  };
  return (
    <dialog ref={ref} className="modal" onCancel={onCancel} aria-labelledby="stepup-title">
      <form className="body stack" onSubmit={submit}>
        <h2 id="stepup-title">{t('admin.stepup.title')}</h2>
        <p className="muted">{t('admin.stepup.body')}</p>
        <label className="field">
          {t('admin.password')}
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        <label className="field">
          {t('admin.mfa.code')}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </label>
        <ErrorNotice error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={!ready || busy}>
            {t('action.confirm')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {t('action.cancel')}
          </button>
        </div>
      </form>
    </dialog>
  );
}
