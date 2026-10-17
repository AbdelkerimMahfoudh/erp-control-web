import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The 2026-10-17 refinement of the redesign:
 * - the contact methods are cards that are the links;
 * - the appearance is a header toggle that follows the device until the visitor chooses (the footer select is gone);
 * - every principal card family shares one elevation and motion system, the Launch cards included.
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
const { ThemeProvider, THEME_STORAGE_KEY } = await import('../src/theme/theme');
const { pathOf } = await import('../src/site/routes');
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

/** A device preference, as `matchMedia` reports it. */
function prefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  prefersDark(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('the theme toggle', () => {
  it('is in the header, and the footer has no appearance select any more', () => {
    const { container } = mount(pathOf('home', 'en'));
    expect(container.querySelector('.chrome-header button.theme-toggle')).not.toBeNull();
    expect(container.querySelector('.chrome-footer select')).toBeNull();
    expect(container.querySelector('.chrome-footer .theme-choice')).toBeNull();
    expect(container.querySelectorAll('.theme-toggle')).toHaveLength(1);
  });

  it('switches directly between light and dark, says its action, and keeps the choice', () => {
    const { container } = mount(pathOf('home', 'en'));
    const toggle = container.querySelector<HTMLButtonElement>('.chrome-header .theme-toggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode');
    expect(toggle.getAttribute('title')).toBe('Switch to dark mode');
    act(() => fireEvent.click(toggle));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
    act(() => fireEvent.click(toggle));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('names its action in French and Arabic too', () => {
    for (const lang of ['fr', 'ar'] as const) {
      storeLanguage(lang);
      const { container, unmount } = mount(pathOf('home', lang));
      expect(container.querySelector('.theme-toggle')?.getAttribute('aria-label')).toBe(CATALOGUE[lang]['theme.toDark']);
      unmount();
    }
  });

  it('on a first visit follows the device, without storing anything; a stored choice wins over the device', () => {
    prefersDark(true);
    const first = mount(pathOf('home', 'en'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(first.container.querySelector('.theme-toggle')?.getAttribute('aria-label')).toBe('Switch to light mode');
    first.unmount();
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    mount(pathOf('home', 'en'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('the boot script applies the same rule before the first paint', () => {
    const boot = readFileSync(join(process.cwd(), 'public/theme-boot.js'), 'utf8');
    expect(boot).toMatch(/localStorage\.getItem\('erp\.web\.theme'\)/);
    expect(boot).toMatch(/prefers-color-scheme: dark/);
  });
});

describe('the contact methods', () => {
  it.each(['en', 'fr', 'ar'] as const)('are cards whose links are the real mailto: and tel: addresses, named for the action (%s)', (lang) => {
    storeLanguage(lang);
    const c = CATALOGUE[lang];
    const { container } = mount(pathOf('contact', lang));
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.contact-methods a.contact-link')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'mailto:contact@tsxmr.com',
      'mailto:support@tsxmr.com',
      'mailto:privacy@tsxmr.com',
      'mailto:security@tsxmr.com',
      'tel:+22236963839',
      'tel:+22237676827',
    ]);
    // The value stays visible, the action is a word in the reader's language, and the name says both with the purpose.
    expect(links[0]!.textContent).toContain('contact@tsxmr.com');
    expect(links[0]!.textContent).toContain(c['contact.write']);
    expect(links[0]!.getAttribute('aria-label')).toBe(c['contact.writeName'].replace('{purpose}', c['org.contactEmail']).replace('{value}', 'contact@tsxmr.com'));
    expect(links[4]!.getAttribute('aria-label')).toBe(c['contact.callName'].replace('{value}', '+222 36 96 38 39'));
    // Each card belongs to the shared elevation system; the telephones claim no purpose and no WhatsApp.
    for (const card of container.querySelectorAll('.contact-card')) expect(card.classList.contains('elevated')).toBe(true);
    expect(container.querySelector('.contact-methods')?.textContent).not.toContain(c['org.whatsapp']);
    // The values read left to right, in Arabic too.
    for (const value of container.querySelectorAll('.contact-value')) expect(value.getAttribute('dir')).toBe('ltr');
    expect(container.querySelectorAll('.contact-group-title')).toHaveLength(2);
  });

  it('in Arabic, the page is right to left and the cards follow it', () => {
    storeLanguage('ar');
    mount(pathOf('contact', 'ar'));
    expect(document.documentElement.dir).toBe('rtl');
  });
});

describe('one card elevation and motion system', () => {
  const css = readFileSync(join(process.cwd(), 'src/theme/public.css'), 'utf8');

  it('the Launch cards use it, as do the other principal card families', () => {
    const product = mount(pathOf('dukanErp', 'en'));
    const launch = product.container.querySelector('#start-h')!.closest('section')!;
    expect(launch.querySelector('h2')?.textContent).toBe('Launch');
    const steps = [...launch.querySelectorAll('li')];
    expect(steps.length).toBe(3);
    for (const step of steps) expect(step.classList.contains('elevated')).toBe(true);
    for (const card of product.container.querySelectorAll('.activity-card')) expect(card.classList.contains('elevated')).toBe(true);
    product.unmount();
    const home = mount(pathOf('home', 'en'));
    for (const selector of ['.problem-grid > li', '.bento > li', '.activities > .card', '.how-steps > li', '.previews > li', '.lang-cards > li']) {
      const cards = [...home.container.querySelectorAll(selector)];
      expect({ selector, count: cards.length > 0 }).toEqual({ selector, count: true });
      for (const card of cards) expect({ selector, elevated: card.classList.contains('elevated') }).toEqual({ selector, elevated: true });
    }
  });

  it('rises on hover only where hover exists, and on keyboard focus; never by a one-off rule', () => {
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.elevated:hover \{\s*translate: 0 var\(--lift\);/);
    expect(css).toMatch(/\.elevated:has\(:focus-visible\) \{\s*translate: 0 var\(--lift\);/);
    expect(css).not.toMatch(/card-lift|\.tile:hover/);
    // The reveal's stagger delays only the reveal, never the hover.
    expect(css).not.toMatch(/transition-delay/);
    expect(css).toMatch(/transform 0\.55s var\(--ease\) var\(--reveal-delay, 0s\)/);
  });

  it('reduced motion keeps the shadow and drops the movement', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/:root \{\s*--lift: 0px;\s*--nudge: 0px;\s*\}/);
    expect(css).not.toMatch(/translate: -?\d+px 0/);
    // Every rise is the token, so the reset reaches all of them.
    expect(css.match(/translate: 0 var\(--lift\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css).not.toMatch(/translate: 0 -\d/);
  });
});
