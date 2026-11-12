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

/** Time left until an instant the server recorded, in whole days and hours ("6 days, 23 hours"); nothing once it passed. */
export function formatTimeLeft(untilIso: string | null, lang: Language, now: number = Date.now()): string | null {
  if (!untilIso) return null;
  const ms = new Date(untilIso).getTime() - now;
  if (!(ms > 0)) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const unit = (n: number, u: 'day' | 'hour') => new Intl.NumberFormat(LOCALE[lang], { style: 'unit', unit: u, unitDisplay: 'long' }).format(n);
  const parts = days > 0 ? [unit(days, 'day'), unit(hours, 'hour')] : [unit(Math.max(hours, 0), 'hour')];
  return new Intl.ListFormat(LOCALE[lang], { type: 'unit', style: 'long' }).format(parts);
}

export function formatInt(n: number, lang: Language): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

/** Owner, 2026-11-12: a local mobile number — eight digits, shown in pairs, without +222 (older records may carry it). */
export function localNumber(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '').replace(/^(?:00)?222(?=\d{8}$)/, '');
  return digits.length === 8 ? digits.replace(/(\d{2})(?=\d)/g, '$1 ') : raw;
}

/**
 * Owner, 2026-11-12: the number a payment was sent from, as the Owner types or pastes it. Spaces, dots, dashes and
 * brackets are dropped, and an explicit +222 or 00222 in front of eight digits is dropped too ("+222 36 96 38 39" →
 * "36963839"). Nothing else changes: an eight-digit number beginning with 222 is kept as it is, and a number of the
 * wrong length is never cut — it stays as entered, so the form can say it is wrong.
 */
export function payerInput(raw: string): string {
  const compact = raw.replace(/[\s.\-()]/g, '');
  const local = compact.match(/^(?:\+|00)222(\d{8})$/);
  return local ? local[1]! : compact;
}
