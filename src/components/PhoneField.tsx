import { useState } from 'react';
import { useI18n } from '../i18n';
import { composePhone, countryName, PHONE_COUNTRIES, splitPhone, typedInternational } from '../lib/phone-input';

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
      <select
        aria-label={t('phone.country')}
        value={iso}
        disabled={whole}
        onChange={(e) => {
          setIso(e.target.value);
          onChange(composePhone(e.target.value, national));
        }}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {`+${c.code} ${countryName(c, lang)}`}
          </option>
        ))}
      </select>
    </span>
  );
}
