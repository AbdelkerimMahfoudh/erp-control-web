import { LANGUAGE_CODES, LANGUAGE_LABELS, LANGUAGES, useI18n, type Language } from '../i18n';
import { useTheme } from '../theme/theme';
import { Icon } from './public/icons';

/*
 * The controls every frame shares (the 2026-10-17 consistency pass): the appearance toggle and the names of the
 * languages — the company site's header, the app's pages and the portal alike.
 */

/** "EN, English", "FR, Français", "AR, العربية". */
export const languageName = (l: Language) => `${LANGUAGE_CODES[l]}, ${LANGUAGE_LABELS[l]}`;

/**
 * The appearance, one tap from every page (the 2026-10-17 refinement; it replaces the footer's select). The icon shows
 * where a press leads — a moon while light, a sun while dark — and is chosen by CSS from `data-theme`, so it is right
 * before any script runs; the name says the action, in the reader's language.
 */
export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const label = t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark');
  return (
    <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      <Icon name="moon" size={20} className="theme-icon-moon" />
      <Icon name="sun" size={20} className="theme-icon-sun" />
    </button>
  );
}

/**
 * The languages where the address carries none — the portal and the console: the page switches in place and the
 * choice is stored. The same segmented control as the company site's (`public.css` `.languages`), each segment shown by
 * its code and named by the code and the language in full.
 */
export function LanguageSwitch() {
  const { t, lang, setLanguage } = useI18n();
  return (
    <ul className="languages" aria-label={t('nav.languages')}>
      {LANGUAGES.map((l) => (
        <li key={l}>
          <button type="button" className="link-button" lang={l} aria-pressed={l === lang} aria-label={languageName(l)} onClick={() => setLanguage(l)}>
            {LANGUAGE_CODES[l]}
          </button>
        </li>
      ))}
    </ul>
  );
}
