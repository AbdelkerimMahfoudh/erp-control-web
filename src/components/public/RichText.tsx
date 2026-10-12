import { Fragment, type ReactNode } from 'react';
import { FILLED_INPUTS, IS_PREVIEW, SITE } from '../../config/site';
import { useI18n } from '../../i18n';
import type { Language } from '../../i18n/languages';

/**
 * Texts with their inputs filled (docs/74 §4). `{supportEmail}` becomes a mail link, a value that reads left to right
 * keeps its order inside Arabic, a blank value or a `[[blocker:id]]` becomes a visible "pending" mark — a production
 * build never reaches one (the release check refuses first), so a reader of the real site never sees a gap.
 */

const COUNTRY: Record<string, Record<Language, string>> = {
  mauritania: { en: 'Mauritania', fr: 'Mauritanie', ar: 'موريتانيا' },
};

const DELETION_CHANNEL_NAMES: Record<string, string> = { whatsapp: 'WhatsApp' };

/** Every value a text may name: the inputs, and the few derived from them. */
export function textValues(lang: Language): Record<string, string> {
  const country = COUNTRY[SITE.country.trim().toLowerCase()]?.[lang] ?? SITE.country;
  return {
    ...SITE,
    country,
    deletionChannelName: DELETION_CHANNEL_NAMES[SITE.deletionChannel] ?? '',
    productName: 'Dukan ERP',
  };
}

const TOKEN = /\{([a-zA-Z]+)\}|\[\[blocker:([a-z0-9_]+)\]\]/g;

/** Plain text for a title or a meta description: inputs filled, blockers and blanks dropped. */
export function plainText(text: string, values: Record<string, string>): string {
  return text
    .replace(TOKEN, (_m, name: string | undefined) => (name ? values[name] ?? '' : ''))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
}

export function RichText({ text }: { text: string }) {
  const { t, lang } = useI18n();
  const values = textValues(lang);
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) parts.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const [, name, blocker] = m;
    if (blocker) {
      parts.push(
        <mark key={i++} className="pending" data-blocker={blocker}>
          {t('pending.decision', { id: blocker })}
        </mark>,
      );
    } else if (name) {
      const value = values[name] ?? '';
      const testValue = IS_PREVIEW && (FILLED_INPUTS as readonly string[]).includes(name);
      if (!value) {
        parts.push(
          <mark key={i++} className="pending" data-input={name}>
            {t('pending.value', { name })}
          </mark>,
        );
      } else if (name.endsWith('Email')) {
        parts.push(
          <a key={i++} href={`mailto:${value}`} className={testValue ? 'test-value' : undefined}>
            <bdi>{value}</bdi>
          </a>,
        );
      } else {
        parts.push(
          <bdi key={i++} className={testValue ? 'test-value' : undefined}>
            {value}
          </bdi>,
        );
      }
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}
