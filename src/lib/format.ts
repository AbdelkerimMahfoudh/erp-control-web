import type { Language } from '../i18n';

const LOCALE: Record<Language, string> = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-MR' };

/** A server amount in MRU. Formats; never computes. */
export function formatMru(amount: number | string, lang: Language): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  return `${new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 2 }).format(n)} MRU`;
}

export function formatDate(iso: string | null | undefined, lang: Language): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(iso: string | null | undefined, lang: Language): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/**
 * A trial instant (2026-10-13): the server's UTC value, shown in the business's configured zone — the zone the server
 * names, never this browser's and never one written here — followed by that zone's name, so "ends on" names the same
 * moment wherever the Owner reads it. Mauritania keeping GMT today is the server's answer, not an assumption made
 * here. A zone this browser does not know, or a value it cannot read, is shown exactly as the server sent it.
 */
export function formatInstant(iso: string | null | undefined, timeZone: string | null | undefined, lang: Language): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || !timeZone) return iso;
  try {
    const when = new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'long', timeStyle: 'short', timeZone }).format(d);
    const zone = new Intl.DateTimeFormat(LOCALE[lang], { timeZone, timeZoneName: 'long' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value;
    return zone ? `${when} (${zone})` : when;
  } catch {
    return iso;
  }
}

/** A wait shorter than an hour as minutes and seconds ("4:05"), in the language's own digits. */
export function formatWait(seconds: number, lang: Language): string {
  const two = new Intl.NumberFormat(LOCALE[lang], { minimumIntegerDigits: 2 });
  return `${new Intl.NumberFormat(LOCALE[lang]).format(Math.floor(seconds / 60))}:${two.format(seconds % 60)}`;
}

/** Items joined the way the language joins them ("a, b and c"), each kept whole so it can be isolated on its own. */
export function listParts(items: string[], lang: Language): { type: 'element' | 'literal'; value: string }[] {
  return new Intl.ListFormat(LOCALE[lang], { type: 'conjunction' }).formatToParts(items);
}

export function formatInt(n: number, lang: Language): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}
