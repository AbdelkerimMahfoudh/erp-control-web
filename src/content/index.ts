/**
 * Every long text of the public site, in one place (docs/74 §4), for the pages, the parity test and the release
 * check. A text added to the site must be listed here, or the release check cannot see its blockers.
 */
import type { Language } from '../i18n/languages';
import { about, applicationStatus, contact, login, products, support } from './pages';
import { accountDeletion } from './legal-deletion';
import { privacy } from './legal-privacy';
import { terms } from './legal-terms';
import { privacyChoices } from './legal-choices';
import { legalNotice } from './legal-notice';
import { security } from './legal-security';
import { home } from './home';
import { dukanErp } from './dukan-erp';
import { BLOCKERS, type Blocker } from './blockers';
import { looksLikePlaceholder } from '../config/schema';
import { blockersIn, textsOf, type Document, type LegalDocument } from './types';

export { about, applicationStatus, contact, login, products, support, accountDeletion, privacy, terms, privacyChoices, legalNotice, security, home, dukanErp };

export const DOCUMENTS = { about, applicationStatus, contact, login, products, support, accountDeletion, privacy, terms, privacyChoices, legalNotice, security } satisfies Record<string, Record<Language, Document>>;

/** Every string inside any value — for the structured pages that are not `Document`s. */
export function stringsOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringsOf(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) stringsOf(v, out);
  return out;
}

/** Every published text in a language. */
export function allTexts(lang: Language): string[] {
  return [...Object.values(DOCUMENTS).flatMap((d) => textsOf(d[lang])), ...stringsOf(home[lang]), ...stringsOf(dukanErp[lang])];
}

/** The blockers still present in any language's published text — a production build refuses while any remains. */
export function publishedBlockers(): Blocker[] {
  const ids = new Set<string>();
  for (const lang of ['en', 'fr', 'ar'] as const) for (const id of blockersIn(allTexts(lang))) ids.add(id);
  return [...ids].sort().map((id) => BLOCKERS.find((b) => b.id === id) ?? { id, summary: 'Unknown blocker id — add it to blockers.ts.' });
}

/** The legal documents, by name: what the draft label and the release check read. */
export const LEGAL_DOCUMENTS = { privacy, terms, accountDeletion, privacyChoices, legalNotice, security } satisfies Record<string, Record<Language, LegalDocument>>;

/** Legal documents still marked draft in any language — a production build refuses while any remains (docs/85). */
export function publishedDrafts(): string[] {
  return Object.entries(LEGAL_DOCUMENTS)
    .filter(([, doc]) => (['en', 'fr', 'ar'] as const).some((lang) => doc[lang].status !== 'approved'))
    .map(([name]) => name)
    .sort();
}

/** Published texts that are still placeholders (`[TO BE PROVIDED]` and its kind) — refused in production. */
export function publishedPlaceholders(): string[] {
  const found = new Set<string>();
  for (const lang of ['en', 'fr', 'ar'] as const) for (const t of allTexts(lang)) if (looksLikePlaceholder(t)) found.add(t);
  return [...found];
}
