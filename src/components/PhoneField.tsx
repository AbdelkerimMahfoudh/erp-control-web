import { useState } from 'react';
import { useI18n } from '../i18n';
import { useMemo } from 'react';
import { composePhone, countriesFor, countryName, searchCountries, splitPhone, typedInternational } from '../lib/phone-input';

/**
 * The shared international phone input (D227): a country and the national digits, handed on as one international
 * string (`+222…`). A number typed whole with `+` or `00` keeps its own country. Used inside `Field`, whose label names
 * the number; the country list carries its own name. Safe for the portal and the admin console alike.
 */
export function PhoneField({
  value,
  onChange,
  required,
  invalid,
  'aria-describedby': describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  'aria-describedby'?: string;
}) {
  const { t, lang } = useI18n();
  const [initial] = useState(() => splitPhone(value));
  const [iso, setIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => countriesFor(lang), [lang]);
  const shown = useMemo(() => {
    const found = searchCountries(sorted, query, lang);
    return found.some((c) => c.iso === iso) ? found : [...sorted.filter((c) => c.iso === iso), ...found];
  }, [sorted, query, lang, iso]);
  // A form that clears or replaces its value (after a save) is followed, not overridden.
  if (value !== composePhone(iso, national)) {
    const next = splitPhone(value, iso);
    setIso(next.iso);
    setNational(next.national);
  }
  const whole = typedInternational(national);

  return (
    <span className="phone-field" dir="ltr">
      <input
        required={required}
        inputMode="tel"
        autoComplete="off"
        maxLength={24}
        dir="ltr"
        value={national}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          setNational(e.target.value);
          onChange(composePhone(iso, e.target.value));
        }}
      />
      {/* Post-Build-4: every country and territory, in the reading language's order; the search narrows the list and keeps the chosen one. */}
      <input
        type="search"
        aria-label={t('phone.country.search')}
        placeholder={t('phone.country.search')}
        value={query}
        disabled={whole}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        aria-label={t('phone.country')}
        value={iso}
        disabled={whole}
        onChange={(e) => {
          setIso(e.target.value);
          onChange(composePhone(e.target.value, national));
        }}
      >
        {shown.map((c) => (
          <option key={c.iso} value={c.iso}>
            {`+${c.code} ${countryName(c, lang)}`}
          </option>
        ))}
      </select>
    </span>
  );
}
