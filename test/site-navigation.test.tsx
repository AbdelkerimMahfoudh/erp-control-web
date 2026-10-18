import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The 2026-10-17 consistency pass: the phone menu is an icon button that opens, closes and returns focus like a
 * disclosure; the language controls show EN, FR and AR and keep the full names for assistive technology; and the
 * legal pages' contents, related pages and operator telephones are real links to the same destinations as before.
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
const { I18nProvider, LANGUAGE_STORAGE_KEY, storeLanguage } = await import('../src/i18n');
const { ThemeProvider, THEME_STORAGE_KEY } = await import('../src/theme/theme');
const { pathOf, inAppPathOf } = await import('../src/site/routes');
const { en } = await import('../src/i18n/en');
const { fr } = await import('../src/i18n/fr');
const { ar } = await import('../src/i18n/ar');
const CATALOGUE = { en, fr, ar } as const;

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
  delete document.documentElement.dataset.theme;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('the phone menu', () => {
  it('is an icon button with no visible word, that names its action and controls a panel hidden while closed', () => {
    const { container } = mount(pathOf('home', 'en'));
    const button = container.querySelector<HTMLButtonElement>('.chrome-header button.menu-button')!;
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-label')).toBe('Open menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(panel.hidden).toBe(true);
    // A hidden panel takes no focus: nothing in it is reachable until it opens.
    expect(container.querySelector('.chrome-header details.menu')).toBeNull();
    act(() => fireEvent.click(button));
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Close menu');
    expect(panel.hidden).toBe(false);
    expect(within(panel).getAllByRole('link').length).toBeGreaterThanOrEqual(5 + 3);
  });

  it('closes on Escape and gives focus back to its button', () => {
    const { container } = mount(pathOf('home', 'en'));
    const button = container.querySelector<HTMLButtonElement>('button.menu-button')!;
    act(() => fireEvent.click(button));
    within(document.getElementById('site-menu')!).getAllByRole('link')[0]!.focus();
    act(() => fireEvent.keyDown(document, { key: 'Escape' }));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('closes when a destination is chosen, and when a press lands outside it', () => {
    const { container } = mount(pathOf('home', 'en'));
    const button = container.querySelector<HTMLButtonElement>('button.menu-button')!;
    act(() => fireEvent.click(button));
    act(() => fireEvent.click(within(document.getElementById('site-menu')!).getByRole('link', { name: en['nav.about'] })));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    // Another page: focus goes to its heading, never back to the menu (RouteScroll).
    expect(document.activeElement).toBe(container.querySelector('main h1'));
    // The page already open: nothing moves, so focus returns to the button rather than to a hidden link.
    act(() => fireEvent.click(button));
    act(() => fireEvent.click(within(document.getElementById('site-menu')!).getByRole('link', { name: en['nav.about'] })));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
    act(() => fireEvent.click(button));
    act(() => fireEvent.pointerDown(container.querySelector('main')!));
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('names its two actions in French and Arabic', () => {
    for (const lang of ['fr', 'ar'] as const) {
      storeLanguage(lang);
      const { container, unmount } = mount(pathOf('home', lang));
      const button = container.querySelector<HTMLButtonElement>('button.menu-button')!;
      expect(button.getAttribute('aria-label')).toBe(CATALOGUE[lang]['nav.openMenu']);
      act(() => fireEvent.click(button));
      expect(button.getAttribute('aria-label')).toBe(CATALOGUE[lang]['nav.closeMenu']);
      unmount();
    }
  });
});

describe('the language controls', () => {
  it.each(['en', 'fr', 'ar'] as const)('show EN, FR and AR, named in full, linking to this page in each language (%s)', (lang) => {
    storeLanguage(lang);
    const { container } = mount(pathOf('privacy', lang));
    for (const list of container.querySelectorAll('.chrome-header ul.languages')) {
      const links = [...list.querySelectorAll('a')];
      expect(links.map((a) => a.textContent)).toEqual(['EN', 'FR', 'AR']);
      // The visible code first, then the language in full (the brief of 2026-10-17, fourth).
      expect(links.map((a) => a.getAttribute('aria-label'))).toEqual(['EN, English', 'FR, Français', 'AR, العربية']);
      expect(links.map((a) => a.getAttribute('lang'))).toEqual(['en', 'fr', 'ar']);
      expect(links.map((a) => a.getAttribute('href'))).toEqual([pathOf('privacy', 'en'), pathOf('privacy', 'fr'), pathOf('privacy', 'ar')]);
      expect(links.filter((a) => a.getAttribute('aria-current') === 'true').map((a) => a.getAttribute('lang'))).toEqual([lang]);
    }
    expect(document.documentElement.lang).toBe(lang);
    expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
  });

  it('keeps the choice, and the appearance, when a language is chosen', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { container } = mount(pathOf('privacy', 'en'));
    act(() => fireEvent.click(container.querySelector<HTMLAnchorElement>('.languages-wide a[lang="ar"]')!));
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('the pages the app opens show the same codes, and still no site navigation or menu', () => {
    const { container } = mount(inAppPathOf('privacy', 'fr'));
    const links = [...container.querySelectorAll('.in-app-header .languages a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('aria-label')])).toEqual([
      ['EN', 'EN, English'],
      ['FR', 'FR, Français'],
      ['AR', 'AR, العربية'],
    ]);
    expect(container.querySelector('.menu-button')).toBeNull();
    expect(container.querySelector('.nav')).toBeNull();
  });
});

describe('the legal pages’ links', () => {
  it.each(['en', 'fr', 'ar'] as const)('the contents link to every section in order, as a numbered list (%s)', (lang) => {
    storeLanguage(lang);
    const { container } = mount(pathOf('privacy', lang));
    const list = container.querySelector('nav.toc ol')!;
    const links = [...list.querySelectorAll('a')];
    const sections = [...container.querySelectorAll('article.doc > section.doc-section')];
    expect(links.length).toBeGreaterThan(5);
    // A real address for each section, on this page, followed through the router (RouteScroll scrolls and focuses it).
    expect(links.map((a) => a.getAttribute('href'))).toEqual(sections.map((s) => `${pathOf('privacy', lang)}#${s.id}`));
    expect(links.map((a) => a.textContent?.replace(/^\d+/, ''))).toEqual(sections.map((s) => s.querySelector('h2')!.textContent));
    // The marker is decorative: the list already gives each item its position.
    expect(links.map((a) => a.querySelector('[aria-hidden="true"]')?.textContent)).toEqual(links.map((_, i) => String(i + 1)));
  });

  it('the related pages mark the one the reader is on', () => {
    const { container } = mount(pathOf('terms', 'en'));
    // Marked as current, as text: not a link that leads back to the page the reader is on.
    const current = [...container.querySelectorAll('.legal-related [aria-current="page"]')];
    expect(current.map((el) => [el.tagName, el.textContent])).toEqual([['SPAN', en['footer.terms']]]);
    expect(container.querySelector(`.legal-related a[href="${pathOf('terms', 'en')}"]`)).toBeNull();
  });

  it.each(['en', 'fr', 'ar'] as const)('the operator’s telephones keep their exact numbers and tel: links, named as a call (%s)', (lang) => {
    storeLanguage(lang);
    const { container } = mount(pathOf('legalNotice', lang));
    const phones = [...container.querySelectorAll<HTMLAnchorElement>('.org-details a')];
    expect(phones.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([
      ['tel:+22236963839', '+222 36 96 38 39'],
      ['tel:+22237676827', '+222 37 67 68 27'],
    ]);
    expect(phones[0]!.getAttribute('aria-label')).toBe(CATALOGUE[lang]['contact.callName'].replace('{value}', '+222 36 96 38 39'));
  });
});
