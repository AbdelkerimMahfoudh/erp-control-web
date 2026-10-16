import { describe, expect, it } from 'vitest';
import { DOCUMENTS, dukanErp, home, stringsOf, terms } from '../src/content';
import { BLOCKERS } from '../src/content/blockers';
import { blockersIn, inputsIn, shapeOf, textsOf } from '../src/content/types';
import { INPUTS } from '../src/config/schema';

/**
 * One canonical structure for every long text (docs/74 §4): a policy can never say less in one language. The shape of
 * every document, every placeholder and every blocker is the same in English, French and Arabic, and no French or
 * Arabic sentence is English left untranslated.
 */
const LANGS = ['en', 'fr', 'ar'] as const;
/** Values a text may name: the inputs, and those derived from them (RichText.textValues). */
const KNOWN_INPUTS = new Set([...Object.keys(INPUTS), 'deletionChannelName', 'productName']);
/** Strings that are the same in every language: names, words French writes as English does, and texts made only of placeholders and blockers. */
const NAME_ONLY = /^(Dukan ERP|Contact|(\s*(\{[a-zA-Z]+\}|\[\[blocker:[a-z_]+\]\])\s*)+)$/;

/** A language-free skeleton of any value: object keys, array lengths, and strings reduced to their tokens. */
function deepShape(v: unknown): unknown {
  if (typeof v === 'string') return { inputs: inputsIn([v]), blockers: blockersIn([v]) };
  if (Array.isArray(v)) return v.map(deepShape);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepShape(x)]));
  return v;
}

const ALL: [string, Record<(typeof LANGS)[number], unknown>][] = [...Object.entries(DOCUMENTS), ['home', home], ['dukanErp', dukanErp]];
/** The words of a value: a document's texts (not its section ids or block kinds), or every string of a page. */
const wordsOf = (name: string, v: unknown): string[] => (name in DOCUMENTS ? textsOf(v as never) : stringsOf(v));

describe('the public texts in three languages', () => {
  it('every document has the same sections, blocks and list lengths in every language', () => {
    for (const [name, doc] of Object.entries(DOCUMENTS)) {
      expect({ name, fr: shapeOf(doc.fr) }).toEqual({ name, fr: shapeOf(doc.en) });
      expect({ name, ar: shapeOf(doc.ar) }).toEqual({ name, ar: shapeOf(doc.en) });
    }
  });

  it('every text carries the same placeholders and blockers, at the same place, in every language', () => {
    for (const [name, value] of ALL) {
      expect({ name, fr: deepShape(value.fr) }).toEqual({ name, fr: deepShape(value.en) });
      expect({ name, ar: deepShape(value.ar) }).toEqual({ name, ar: deepShape(value.en) });
    }
  });

  it('names only inputs that exist, and only blockers that are registered', () => {
    const ids = new Set(BLOCKERS.map((b) => b.id));
    for (const [name, value] of ALL) {
      for (const lang of LANGS) {
        const texts = stringsOf(value[lang]);
        for (const input of inputsIn(texts)) expect({ name, lang, input, known: KNOWN_INPUTS.has(input) }).toEqual({ name, lang, input, known: true });
        for (const id of blockersIn(texts)) expect({ name, lang, id, registered: ids.has(id) }).toEqual({ name, lang, id, registered: true });
      }
    }
  });

  it('never leaves a French or Arabic text merely copied from English', () => {
    for (const [name, value] of ALL) {
      const en = wordsOf(name, value.en);
      const fr = wordsOf(name, value.fr);
      const ar = wordsOf(name, value.ar);
      en.forEach((text, i) => {
        if (NAME_ONLY.test(text)) return;
        expect({ name, i, fr: fr[i] }).not.toEqual({ name, i, fr: text });
        expect({ name, i, ar: ar[i] }).not.toEqual({ name, i, ar: text });
      });
    }
  });

  it('every legal text names its version, and none is empty', () => {
    for (const name of ['privacy', 'terms', 'accountDeletion'] as const) {
      for (const lang of LANGS) {
        const doc = DOCUMENTS[name][lang];
        expect(doc.version).toMatch(/^\d+\.\d+/);
        expect(textsOf(doc).every((t) => t.trim().length > 0)).toBe(true);
      }
    }
  });

  it('names no payment provider and makes no availability or endorsement claim', () => {
    for (const [name, value] of ALL) {
      for (const lang of LANGS) {
        // The terms' one denial — Dukan ERP is not Bankily or Sedad (brief of 2026-10-16) — is the only provider mention.
        const denial = name === 'terms' ? (value[lang] as typeof terms.en).sections.find((s) => s.id === 'not_bank')!.blocks[0] : null;
        const all = stringsOf(value[lang])
          .filter((t) => !denial || t !== (denial as { text: string }).text)
          .join('\n');
        expect({ name, lang, provider: /bankily|masrivi|sedad|bimbank/i.test(all) }).toEqual({ name, lang, provider: false });
        expect({ name, lang, store: /download on the|get it on|available on the app store/i.test(all) }).toEqual({ name, lang, store: false });
        expect({ name, lang, filler: /lorem|ipsum|todo|tbd/i.test(all) }).toEqual({ name, lang, filler: false });
        // D164: the commission is typed per exchange and paid by the customer — never a rate the Owner configures.
        const rateClaim = /rate the owner|configured rate|from the rate|taux que le propriétaire|à partir du taux|النسبة التي يضبطها|وفق النسبة/i;
        expect({ name, lang, rateClaim: rateClaim.test(all) }).toEqual({ name, lang, rateClaim: false });
      }
    }
  });
});
