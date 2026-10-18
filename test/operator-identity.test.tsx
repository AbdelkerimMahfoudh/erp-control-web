import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { operatorStatus } from '../src/content/operator';

/**
 * Who operates the public website (the owner's brief of 2026-10-17, third): TSX-MR is a project and trading name, not a
 * company, operated by one individual. The sentence that says so, in three languages, and the pages that show it.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return {
    ...real,
    SITE: Object.freeze({ ...real.SITE, siteSurface: 'public', portalOrigin: '', phone: '+222 36 96 38 39, +222 37 67 68 27' }),
    SURFACE: 'public',
  };
});
vi.mock('../src/protected-areas', () => import('../src/protected-areas.public'));

const { App } = await import('../src/app');
const { I18nProvider, storeLanguage } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { pathOf } = await import('../src/site/routes');

const NAME = 'Abdel Kerim Taleb Ould Sidi';
const site = { displayName: 'TSX-MR', legalName: NAME, operatorType: 'individual' };

function mount(path: string) {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the operator sentence', () => {
  it('says, in each language, that TSX-MR is a name and not a company, operated by the individual the owner named', () => {
    expect(operatorStatus('en', site)).toBe(`TSX-MR is a project and trading name. It is not a separately incorporated company: it is operated by ${NAME}, an individual (“the operator”).`);
    expect(operatorStatus('fr', site)).toContain(`exploité par ${NAME}, personne physique (ci-après « l’exploitant »)`);
    expect(operatorStatus('ar', site)).toContain(`شخصٌ طبيعي هو ${NAME}، ويُشار إليه فيما يلي بـ«المشغّل»`);
  });

  it('assumes nothing about the person: no gendered pronoun in English or French', () => {
    expect(operatorStatus('en', site)).not.toMatch(/\b(he|she|his|her|him)\b/i);
    expect(operatorStatus('fr', site)).not.toMatch(/\b(il est géré|elle|Monsieur|Madame|M\.)\b/);
  });

  it('names a company only when one is configured, and says nothing when no operator is known', () => {
    expect(operatorStatus('en', { ...site, operatorType: 'company', legalName: 'Example SARL' })).toBe('TSX-MR is a trading name of Example SARL (“the operator”).');
    expect(operatorStatus('en', { ...site, legalName: '' })).toBe('');
  });
});

describe('the public pages', () => {
  it('the legal notice: operator, status, person responsible for publication, the two numbers; no legal form or RCCM', () => {
    const { container } = mount(pathOf('legalNotice', 'en'));
    const text = container.textContent ?? '';
    expect(text).toContain(operatorStatus('en', site));
    expect(text).toContain('no legal form and no trade-register (RCCM) number');
    expect(text).toContain(`The person responsible for publication is ${NAME}.`);
    expect(text).not.toMatch(/Legal form|Registration number/);
    const tel = [...container.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(tel).toContain('tel:+22236963839');
    expect(tel).toContain('tel:+22237676827');
  });

  it('in Arabic the operator sentence keeps the paragraph’s direction — never isolated as left-to-right text', () => {
    storeLanguage('ar');
    const { container } = mount(pathOf('legalNotice', 'ar'));
    const publisher = container.querySelector('#entity p');
    expect(publisher?.textContent).toContain(operatorStatus('ar', site));
    // The sentence is not inside a <bdi>: one would lay "TSX-MR …" out left to right inside Arabic.
    expect([...(publisher?.querySelectorAll('bdi') ?? [])].map((b) => b.textContent)).not.toContain(operatorStatus('ar', site));
    // Phone numbers keep their reading order inside Arabic.
    expect(container.querySelector('a[href^="tel:"] bdi')?.getAttribute('dir')).toBe('ltr');
  });
});

/**
 * Where the person's name appears (the brief of 2026-10-17, fourth): once in each legal text that must say who is
 * accountable — then "the operator" — and a second time on the legal notice, for the person responsible for
 * publication. Never in the marketing pages, the footer or their structured data.
 */
describe('the name, only where a legal text needs it', () => {
  const count = (text: string) => text.split(NAME).length - 1;
  for (const lang of ['en', 'fr', 'ar'] as const) {
    it(`in ${lang}: the brand pages and the footer never name the person; each legal text names them as it must`, () => {
      const expected: Record<string, number> = {
        home: 0,
        services: 0,
        about: 0,
        products: 0,
        dukanErp: 0,
        contact: 0,
        support: 0,
        privacy: 1,
        terms: 1,
        legalNotice: 2,
        privacyChoices: 0,
        accountDeletion: 0,
        security: 0,
      };
      for (const [id, times] of Object.entries(expected)) {
        const { container } = mount(pathOf(id as Parameters<typeof pathOf>[0], lang));
        expect({ id, lang, times: count(container.textContent ?? '') }).toEqual({ id, lang, times });
        expect({ id, lang, footer: count(container.querySelector('footer.chrome-footer')?.textContent ?? '') }).toEqual({ id, lang, footer: 0 });
        cleanup();
      }
    });
  }
});

describe('the host’s address in Arabic', () => {
  it('is one left-to-right isolate, so its street number keeps its place inside the Arabic sentence', async () => {
    const { legalNoticePrelaunch } = await import('../src/content/legal-prelaunch');
    const hosting = legalNoticePrelaunch.ar.sections.find((s) => s.id === 'hosting')!.blocks[0]!;
    const text = hosting.kind === 'p' ? hosting.text : '';
    expect(text).toContain('\u2066Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107\u2069');
  });
});
