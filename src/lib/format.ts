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

export function formatInt(n: number, lang: Language): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}
