import type { Language } from '../i18n/languages';

/**
 * Riyade, TSX-MR's second own product (the owner's brief of 2026-10-20): presented as coming soon, with as little as
 * possible. The site says only these words — its name, one line, who makes it and for whom, and that it is coming
 * soon — in the owner's approved copy, the same on every surface. `{displayName}` is TSX-MR.
 *
 * Never said anywhere about it, in any language, in a page, a title, a description, structured data or alt text: what it
 * does or is made of, how it is built, a price, a subscription, a trial or a free period, a release date or a delay, a
 * beta, a registration, a sign-in, a waiting list, a figure, a school's name, a partner or a screen of the application. It
 * has no logo: its mark is its name, set in type (`components/public/riyade.tsx`). A test holds all of this
 * (`test/riyade.test.tsx`).
 */

/** The product's name, the same in every language: never translated, transliterated or written in another script. */
export const RIYADE_NAME = 'Riyade';

export interface RiyadeContent {
  /** The one line under the name. */
  tagline: string;
  /** Who makes it and for whom: the whole of its description. */
  attribution: string;
  /** Its status, in words. */
  status: string;
}

export const riyade: Record<Language, RiyadeContent> = {
  en: {
    tagline: 'School life, simply connected.',
    attribution: 'A new {displayName} product for schools and their communities.',
    status: 'Coming soon',
  },
  fr: {
    tagline: 'La vie scolaire, simplement connectée.',
    attribution: 'Un nouveau produit {displayName} destiné aux établissements scolaires et à leur communauté.',
    status: 'Bientôt disponible',
  },
  ar: {
    tagline: 'حياة مدرسية أكثر ترابطًا وبساطة',
    attribution: 'منتج جديد من {displayName} للمؤسسات التعليمية ومجتمعاتها.',
    status: 'قريبًا',
  },
};

/** The product's page title and description: its name, and who makes it, for whom, and that it is coming soon. */
export function riyadeMeta(lang: Language): { title: string; description: string } {
  const c = riyade[lang];
  return { title: RIYADE_NAME, description: `${c.attribution} ${c.status}.` };
}
