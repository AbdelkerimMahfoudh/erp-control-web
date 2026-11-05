import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * docs/119, regenerated from the approved texts (owner, 2026-11-05): every legal page and the support page in EN, FR and
 * AR, as a portal build publishes them — the same content, the same filled values (the build's environment), the same
 * TSXMR spelling. Writes only when `GEN_LEGAL_MD` names the output file; otherwise it only checks that it can render.
 *
 *   GEN_LEGAL_MD=../erp-docs/docs/119_LEGAL_PAGES_FOR_APPROVAL.md VITE_SITE_SURFACE=portal VITE_…=… npx vitest run test/legal-markdown.gen.test.ts
 */
const ORDER = ['privacy', 'privacyChoices', 'terms', 'accountDeletion', 'security', 'legalNotice'] as const;
const NAMES: Record<(typeof ORDER)[number], string> = {
  privacy: 'Privacy policy',
  privacyChoices: 'Privacy choices',
  terms: 'Terms of service',
  accountDeletion: 'Account deletion',
  security: 'Security',
  legalNotice: 'Legal notice',
};
const LANGS = [
  ['en', 'English'],
  ['fr', 'Français'],
  ['ar', 'العربية'],
] as const;

describe('docs/119 from the approved texts', () => {
  it('renders every approved legal page, filled, in EN, FR and AR', async () => {
    const { legalDocumentsFor } = await import('../src/content');
    const { plainText, textValues } = await import('../src/components/public/RichText');
    const { SITE } = await import('../src/config/site');
    const docs = legalDocumentsFor('portal') as unknown as Record<string, Record<string, import('../src/content/types').LegalDocument>>;
    const out: string[] = [
      '# Dukan ERP legal pages — as published (2026-11-05)',
      '',
      'Generated from erp-control-web `src/content/legal-*.ts` by `test/legal-markdown.gen.test.ts`, with the values the',
      'production portal build uses. These are the approved texts served at https://dukan.tsxmr.com/in-app/… (and /fr/, /ar/):',
      'privacy and account deletion 1.1, the other four 1.0; effective ' + (SITE.legalEffectiveDate || '(not set in this run)') + '.',
      '',
    ];
    let unfilled = 0;
    for (const id of ORDER) {
      for (const [lang, langName] of LANGS) {
        const doc = docs[id]![lang]!;
        const values = textValues(lang);
        const fill = (s: string) => {
          const text = plainText(s, values);
          if (/\{[a-zA-Z]+\}|\[\[blocker/.test(s.replace(/\{([a-zA-Z]+)\}/g, (m, k) => (values[k] ? '' : m)))) unfilled++;
          return text;
        };
        out.push(`## ${NAMES[id]} — ${langName}`, '', `Version ${doc.version} · ${doc.status}${doc.effective ? ` · effective ${doc.effective}` : ''}`, '', `### ${fill(doc.title)}`, '', fill(doc.summary), '');
        for (const s of doc.sections) {
          out.push(`#### ${fill(s.heading)}`, '');
          for (const b of s.blocks) {
            if (b.kind === 'list') out.push(...b.items.map((i) => `- ${fill(i)}`), '');
            else if (b.kind === 'h3') out.push(`**${fill(b.text)}**`, '');
            else if (b.kind === 'note') out.push(`> ${fill(b.text)}`, '');
            else out.push(fill(b.text), '');
          }
        }
      }
    }
    const md = out.join('\n').replace(/\n{3,}/g, '\n\n');
    expect(md).not.toMatch(/TSX-MR/);
    for (const id of ORDER) expect(docs[id]!.en!.status).toBe('approved');
    if (process.env.GEN_LEGAL_MD) {
      expect(unfilled).toBe(0);
      writeFileSync(process.env.GEN_LEGAL_MD, md, 'utf8');
    }
  });
});
