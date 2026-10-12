/**
 * One shape for every long text on the public site (docs/74 §4): a page is sections, a section is blocks, and the
 * three languages fill the same shape — the parity test refuses a section, a block, a list item, a placeholder or a
 * blocker present in one language and missing in another, so a policy can never silently say less in Arabic.
 *
 * Inside a text:
 *  - `{name}` is a production input (`legalName`, `supportEmail`, …), filled at render;
 *  - `[[blocker:id]]` marks a sentence that waits for a decision the owner has not made (`blockers.ts`). A preview
 *    shows it as a visible "pending" mark; a production build refuses to start while any remains.
 */

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'h3'; text: string }
  | { kind: 'note'; text: string };

export interface Section {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface Document {
  title: string;
  /** One or two sentences under the title; also the page's meta description. */
  summary: string;
  sections: Section[];
}

/** A legal text names what it is and since when (the brief: version and effective date on every legal page). */
export interface LegalDocument extends Document {
  version: string;
}

export const BLOCKER_TOKEN = /\[\[blocker:([a-z0-9_]+)\]\]/g;
export const INPUT_TOKEN = /\{([a-zA-Z]+)\}/g;

/** Every text inside a document, in order — what the parity and blocker checks read. */
export function textsOf(doc: Document): string[] {
  const out = [doc.title, doc.summary];
  for (const s of doc.sections) {
    out.push(s.heading);
    for (const b of s.blocks) {
      if (b.kind === 'list') out.push(...b.items);
      else out.push(b.text);
    }
  }
  return out;
}

/** The document's skeleton, language-free: ids, block kinds and list lengths. Equal in every language. */
export function shapeOf(doc: Document): string {
  return doc.sections.map((s) => `${s.id}(${s.blocks.map((b) => (b.kind === 'list' ? `list${b.items.length}` : b.kind)).join(',')})`).join(' ');
}

export function blockersIn(texts: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(BLOCKER_TOKEN)) ids.add(m[1]!);
  return [...ids].sort();
}

export function inputsIn(texts: readonly string[]): string[] {
  const names = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(INPUT_TOKEN)) names.add(m[1]!);
  return [...names].sort();
}
