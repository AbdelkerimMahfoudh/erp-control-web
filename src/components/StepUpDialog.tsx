import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';

/**
 * Step-up for administrator decisions: the password is asked for each one and
 * sent with that request only. It is never kept.
 */
export function StepUpDialog({ open, onSubmit, onCancel }: { open: boolean; onSubmit: (password: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState('');
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) setPassword('');
  }, [open]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password) onSubmit(password);
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
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={!password}>
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
