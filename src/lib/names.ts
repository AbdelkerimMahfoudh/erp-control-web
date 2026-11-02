import type { Key } from '../i18n';

/**
 * The two names a business, a store or a person carries (D225), checked here exactly as the API checks them
 * (`erp-backend/src/common/bilingual-name.ts`), so the console says what is wrong beside the field, in the
 * operator's language, before anything is sent — instead of the API's English sentence after.
 */
export const NAME_MAX = 160;

const ARABIC_LETTER = /[ؠ-يٮ-ۓەۮۯۺ-ۼۿݐ-ݿࢠ-ࣉﭐ-ﷻﹰ-ﻼ]/u;
const LATIN_LETTER_OR_DIGIT = /[A-Za-z0-9À-ÖØ-öø-ɏ]/u;
const FORBIDDEN = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/u;

export type NameProblem =
  | 'name_blank'
  | 'name_too_long'
  | 'name_forbidden_character'
  | 'name_latin_has_arabic'
  | 'name_latin_needs_letter';

/** One space between words, nothing around them, composed form — what the API stores. */
export function normalizeName(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function common(value: string): NameProblem | null {
  if (!value) return 'name_blank';
  if (value.length > NAME_MAX) return 'name_too_long';
  if (FORBIDDEN.test(value)) return 'name_forbidden_character';
  return null;
}

export function latinNameProblem(raw: string): NameProblem | null {
  const value = normalizeName(raw);
  const problem = common(value);
  if (problem) return problem;
  if (ARABIC_LETTER.test(value)) return 'name_latin_has_arabic';
  if (!LATIN_LETTER_OR_DIGIT.test(value)) return 'name_latin_needs_letter';
  return null;
}

/** Optional, and not limited to Arabic letters (D227): blank is no name at all. */
export function arabicNameProblem(raw: string): NameProblem | null {
  const value = normalizeName(raw);
  return value ? common(value) : null;
}

/** An account's label for an administrator's list, in their language (D227). Presentation only, and never stored. */
export function adminAccountLine(
  label: { owner: string | null; store: string | null; moreStores: number } | undefined,
  t: (key: Key, vars?: Record<string, string>) => string,
): string {
  if (!label) return '';
  const owner = label.owner ?? t('admin.account.noOwner');
  if (!label.store) return `${owner} — ${t('admin.account.noStores')}`;
  if (label.moreStores === 0) return `${owner} — ${label.store}`;
  return `${owner} — ${label.store} ${t('admin.account.more', { count: String(label.moreStores) })}`;
}

/** The sentence shown beside a field for each problem. */
export function nameProblemKey(problem: NameProblem): Key {
  return `names.problem.${problem}` as Key;
}
