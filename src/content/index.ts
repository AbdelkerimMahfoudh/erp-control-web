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
import { dukanOverview } from './dukan-overview';
import { brand, type BrandContent } from './brand';
import { dukanErp } from './dukan-erp';
import { dukanDemo } from './dukan-demo';
import { riyade } from './riyade';
import { BLOCKERS, type Blocker } from './blockers';
import { looksLikePlaceholder } from '../config/schema';
import { blockersIn, textsOf, type Document, type LegalDocument } from './types';
import type { Surface } from '../config/schema';
import type { DukanOverview } from './dukan-overview';
import type { DukanErpContent } from './dukan-erp';
import { aboutPrelaunch, contactPrelaunch, dukanErpAsPrelaunch, dukanErpPrelaunch, dukanOverviewAsPrelaunch, dukanOverviewPrelaunch, supportPrelaunch } from './prelaunch';
import { accountDeletionPrelaunch, legalNoticePrelaunch, privacyChoicesPrelaunch, privacyPrelaunch, securityPrelaunch, termsPrelaunch } from './legal-prelaunch';

export { about, applicationStatus, contact, login, products, support, accountDeletion, privacy, terms, privacyChoices, legalNotice, security, brand, dukanOverview, dukanErp, dukanDemo, riyade };

export const DOCUMENTS = { about, applicationStatus, contact, login, products, support, accountDeletion, privacy, terms, privacyChoices, legalNotice, security } satisfies Record<string, Record<Language, Document>>;

/** Every string inside any value — for the structured pages that are not `Document`s. */
export function stringsOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringsOf(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) stringsOf(v, out);
  return out;
}

/**
 * The pre-launch website (`VITE_SITE_SURFACE=public`, docs/96): the legal pages and the pages that described a running
 * service, rewritten for a service that is not open yet (`prelaunch.ts`, `legal-prelaunch.ts`). The service's own texts
 * above stay for the portal and the app, whose gates remain closed until the service works.
 */
export const PRELAUNCH_LEGAL_DOCUMENTS = {
  privacy: privacyPrelaunch,
  terms: termsPrelaunch,
  accountDeletion: accountDeletionPrelaunch,
  privacyChoices: privacyChoicesPrelaunch,
  legalNotice: legalNoticePrelaunch,
  security: securityPrelaunch,
} satisfies Record<string, Record<Language, LegalDocument>>;

export const PRELAUNCH_DOCUMENTS = { about: aboutPrelaunch, products, contact: contactPrelaunch, support: supportPrelaunch, ...PRELAUNCH_LEGAL_DOCUMENTS } satisfies Record<
  string,
  Record<Language, Document>
>;

/** The text pages a build of this surface publishes. */
export function documentsFor(surface: Surface): Record<keyof typeof PRELAUNCH_DOCUMENTS, Record<Language, Document>> & Partial<typeof DOCUMENTS> {
  return surface === 'public' ? PRELAUNCH_DOCUMENTS : DOCUMENTS;
}

/** The legal documents a build of this surface publishes (what the draft label and the release check read). */
export function legalDocumentsFor(surface: Surface): Record<keyof typeof LEGAL_DOCUMENTS, Record<Language, LegalDocument>> {
  return surface === 'public' ? PRELAUNCH_LEGAL_DOCUMENTS : LEGAL_DOCUMENTS;
}

/** TSX-MR itself — the home page and the services (`brand.ts`): the same on every surface. */
export function brandFor(lang: Language): BrandContent {
  return brand[lang];
}

/** What Dukan ERP is made of, on its product page (`dukan-overview.ts`). */
export function dukanOverviewFor(lang: Language, surface: Surface): DukanOverview {
  return surface === 'public' ? dukanOverviewAsPrelaunch(dukanOverview[lang], dukanOverviewPrelaunch[lang]) : dukanOverview[lang];
}

export function dukanErpFor(lang: Language, surface: Surface): DukanErpContent {
  return surface === 'public' ? dukanErpAsPrelaunch(dukanErp[lang], dukanErpPrelaunch[lang]) : dukanErp[lang];
}

/** Every published text in a language, in a build of this surface (the public one does not show prices or subscriptions). */
export function allTexts(lang: Language, surface: Surface = 'full'): string[] {
  const dukan = dukanErpFor(lang, surface);
  const shown = surface === 'public' ? { ...dukan, subscription: { title: '', body: '' } } : dukan;
  return [
    ...Object.values(documentsFor(surface)).flatMap((d) => (d ? textsOf(d[lang]) : [])),
    ...stringsOf(brandFor(lang)),
    ...stringsOf(dukanOverviewFor(lang, surface)),
    ...stringsOf(shown),
    ...stringsOf(dukanDemo[lang]),
    ...stringsOf(riyade[lang]),
  ];
}

/** The blockers still present in any language's published text — a production build refuses while any remains. */
export function publishedBlockers(surface: Surface = 'full'): Blocker[] {
  const ids = new Set<string>();
  for (const lang of ['en', 'fr', 'ar'] as const) for (const id of blockersIn(allTexts(lang, surface))) ids.add(id);
  return [...ids].sort().map((id) => BLOCKERS.find((b) => b.id === id) ?? { id, summary: 'Unknown blocker id — add it to blockers.ts.' });
}

/** The legal documents, by name: what the draft label and the release check read. */
export const LEGAL_DOCUMENTS = { privacy, terms, accountDeletion, privacyChoices, legalNotice, security } satisfies Record<string, Record<Language, LegalDocument>>;

/** Legal documents still marked draft in any language — a production build refuses while any remains (docs/85). */
export function publishedDrafts(surface: Surface = 'full'): string[] {
  return Object.entries(legalDocumentsFor(surface))
    .filter(([, doc]) => (['en', 'fr', 'ar'] as const).some((lang) => doc[lang].status !== 'approved'))
    .map(([name]) => name)
    .sort();
}

/** Published texts that are still placeholders (`[TO BE PROVIDED]` and its kind) — refused in production. */
export function publishedPlaceholders(surface: Surface = 'full'): string[] {
  const found = new Set<string>();
  for (const lang of ['en', 'fr', 'ar'] as const) for (const t of allTexts(lang, surface)) if (looksLikePlaceholder(t)) found.add(t);
  return [...found];
}
