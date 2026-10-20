import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Account deletion is a Dukan ERP document, not a TSX-MR page (the owner's approval of 2026-10-19): on a public build it
 * is an entry in the Dukan ERP page's Documentation, and contextual in Support and in the pages the app opens. The
 * company's navigation, footer and quick links leave it out. Its addresses do not move, and its page says whose
 * accounts it is about, that browsing the website creates none, and that information sent by email is a separate
 * request.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return { ...real, SITE: Object.freeze({ ...real.SITE, siteSurface: 'public', portalOrigin: '' }), SURFACE: 'public' };
});
vi.mock('../src/protected-areas', () => import('../src/protected-areas.public'));

const { App } = await import('../src/app');
const { I18nProvider } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { LANGUAGES } = await import('../src/i18n/languages');
const { inAppPathOf, pathOf, PUBLIC_ROUTES } = await import('../src/site/routes');
const { metaFor } = await import('../src/site/meta');
const { en } = await import('../src/i18n/en');
const { fr } = await import('../src/i18n/fr');
const { ar } = await import('../src/i18n/ar');
const CATALOGUE = { en, fr, ar } as const;

const TITLE = { en: 'Delete a Dukan ERP account', fr: 'Supprimer un compte Dukan ERP', ar: 'حذف حساب Dukan ERP' } as const;
/** What the page must say, in each language: no account from browsing, and a separate request for emailed information. */
const SAYS = {
  en: [/Browsing the TSX-MR public website does not create an account/, /are separate requests/],
  fr: [/Consulter le site public de TSX-MR ne crée aucun compte/, /sont deux demandes distinctes/],
  ar: [/ولا يُنشئ تصفّح موقع TSX-MR العام أي حساب/, /طلبان منفصلان/],
} as const;

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

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const linksTo = (root: ParentNode, href: string) => [...root.querySelectorAll('a')].filter((a) => a.getAttribute('href') === href);

describe('account deletion on a public build', () => {
  it('keeps every address it had: the page in three languages and the app’s pages', () => {
    expect(PUBLIC_ROUTES.find((r) => r.id === 'accountDeletion')).toMatchObject({ path: '/account-deletion', indexable: true });
    expect(LANGUAGES.map((l) => pathOf('accountDeletion', l))).toEqual(['/account-deletion', '/fr/account-deletion', '/ar/account-deletion']);
    expect(LANGUAGES.map((l) => inAppPathOf('accountDeletion', l))).toEqual(['/in-app/account-deletion', '/fr/in-app/account-deletion', '/ar/in-app/account-deletion']);
  });

  for (const lang of LANGUAGES) {
    const deletion = pathOf('accountDeletion', lang);

    it(`the Dukan ERP page in ${lang}: one Documentation section, whose one entry opens the deletion page`, () => {
      mount(pathOf('dukanErp', lang));
      const sections = [...document.querySelectorAll('main section')].filter((s) => s.querySelector('h2')?.textContent === CATALOGUE[lang]['dukanErp.docs.title']);
      expect(sections).toHaveLength(1);
      const docs = sections[0]!;
      expect(docs.getAttribute('aria-labelledby')).toBe('docs-h');
      const entry = linksTo(docs, deletion);
      expect(entry).toHaveLength(1);
      expect(entry[0]!.textContent).toBe(CATALOGUE[lang]['dukanErp.docs.deletion']);
      // A documentation entry, not a call to action: a text link, never a button or a card.
      expect(entry[0]!.className).toBe('text-action');
      // And the only deletion link on the page.
      expect(linksTo(document, deletion)).toHaveLength(1);
    });

    it(`the company’s pages in ${lang}: no deletion link in the navigation, the footer or the quick links`, () => {
      for (const id of ['home', 'services', 'products', 'about', 'contact', 'privacy', 'terms', 'privacyChoices', 'legalNotice', 'security'] as const) {
        mount(pathOf(id, lang));
        expect({ id, links: linksTo(document, deletion).length }).toEqual({ id, links: 0 });
        cleanup();
      }
    });

    it(`Support in ${lang} keeps its Dukan ERP deletion section, and only that`, () => {
      mount(pathOf('support', lang));
      const links = linksTo(document, deletion);
      expect(links).toHaveLength(1);
      expect(links[0]!.closest('.legal-related, footer, header')).toBeNull();
      expect(links[0]!.textContent).toBe(TITLE[lang]);
    });

    it(`the deletion page in ${lang}: its new heading and title, whose accounts, and the separate request`, () => {
      mount(deletion);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE[lang]);
      expect(metaFor('accountDeletion', lang).title.startsWith(TITLE[lang])).toBe(true);
      const text = document.querySelector('main')!.textContent ?? '';
      for (const says of SAYS[lang]) expect({ lang, says: says.source, found: says.test(text) }).toEqual({ lang, says: says.source, found: true });
      // Not open, said plainly: nothing implies deletion works today.
      expect(text).toMatch({ en: /not yet open for public registration/, fr: /pas encore ouvert aux inscriptions/, ar: /غير مفتوح للعموم بعد/ }[lang]);
    });

    it(`the app’s pages in ${lang} keep the deletion page in their footer, at its in-app address`, () => {
      mount(inAppPathOf('privacy', lang));
      expect(linksTo(document.querySelector('.in-app-footer')!, inAppPathOf('accountDeletion', lang))).toHaveLength(1);
      cleanup();
      mount(inAppPathOf('accountDeletion', lang));
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE[lang]);
      expect(document.querySelector('.in-app-footer [aria-current="page"]')?.textContent).toBe(CATALOGUE[lang]['footer.deletion']);
    });
  }
});
