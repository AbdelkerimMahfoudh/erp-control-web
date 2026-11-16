import { useState, type InputHTMLAttributes } from 'react';
import { useI18n } from '../i18n';

/**
 * A password field with an eye that shows or hides what was typed (owner, 2026-11-16 — as in the app). Every other
 * prop is the input's own, so it sits in a `Field` like any input.
 */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <span className="password-input">
      <input {...props} type={shown ? 'text' : 'password'} dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShown((s) => !s)}
        aria-label={t(shown ? 'action.hidePassword' : 'action.showPassword')}
        aria-pressed={shown}
        title={t(shown ? 'action.hidePassword' : 'action.showPassword')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown ? <path d="M3 3l18 18" /> : null}
        </svg>
      </button>
    </span>
  );
}
