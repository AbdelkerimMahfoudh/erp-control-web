import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The page for an address that leads nowhere (the owner's brief of 2026-10-17). The host serves the nearest prerendered
 * 404.html with a 404 status; this is what the router renders there, and after a link inside the site: the same page
 * in the address's language, with the app's frame under `/in-app/`, and nothing taken from the address.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return {
    ...real,
    SITE: Object.freeze({ ...real.SITE, siteSurface: 'public', portalOrigin: '' }),
    SURFACE: 'public',
  };
});
vi.mock('../src/protected-areas', () => import('../src/protected-areas.public'));

const { App } = await import('../src/app');
const { I18nProvider } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { inAppPathOf, isInAppPath, pathOf } = await import('../src/site/routes');
const { applyNotFoundHead } = await import('../src/site/head');
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

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the not-found page', () => {
  for (const [path, lang] of [
    ['/qx7-missing', 'en'],
    ['/a/b/c/d/e/missing-deep', 'en'],
    ['/fr/inexistante', 'fr'],
    ['/ar/x/y/z', 'ar'],
    ['/account', 'en'],
    ['/admin/businesses', 'en'],
  ] as const) {
    it(`${path}: one heading in ${lang}, back to that language's home, contact as the second way`, () => {
      const { container } = mount(path);
      const c = CATALOGUE[lang];
      expect([...container.querySelectorAll('h1')].map((h) => h.textContent)).toEqual([c['notFound.title']]);
      expect(container.querySelector('.nf-copy .btn-primary')?.getAttribute('href')).toBe(pathOf('home', lang));
      expect(container.querySelector('.nf-copy .btn-primary')?.textContent).toBe(c['notFound.home']);
      expect(container.querySelector('.nf-copy .btn-ghost')?.getAttribute('href')).toBe(pathOf('contact', lang));
      expect(container.querySelector('.nf-copy .btn-ghost')?.textContent).toBe(c['notFound.contact']);
      // The site's own frame: header navigation and footer, the languages leading to each language's home.
      expect(container.querySelector('.nav-wide')).not.toBeNull();
      expect(container.querySelector('.in-app-header')).toBeNull();
      expect([...container.querySelectorAll('.languages-wide a')].map((a) => a.getAttribute('href'))).toEqual(['/', '/fr', '/ar']);
      // The figure is decoration; the heading says it in words.
      expect(container.querySelector('.nf-mark')?.getAttribute('aria-hidden')).toBe('true');
    });
  }

  for (const [path, lang] of [
    ['/in-app/nope', 'en'],
    ['/in-app/', 'en'],
    ['/fr/in-app/a/b', 'fr'],
    ['/ar/in-app/nope', 'ar'],
  ] as const) {
    it(`${path}: keeps the app's frame — its pages only, nothing that leads out of them`, () => {
      const { container } = mount(path);
      expect(container.querySelector('h1')?.textContent).toBe(CATALOGUE[lang]['notFound.title']);
      expect(container.querySelector('.in-app-header')).not.toBeNull();
      expect(container.querySelector('.nav-wide, .footer-grid, .nf-more, .btn-ghost')).toBeNull();
      expect(container.querySelector('.nf-copy .btn-primary')?.getAttribute('href')).toBe(inAppPathOf('support', lang));
      const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '').filter((h) => !h.startsWith('#'));
      expect(hrefs.filter((h) => !h.includes('/in-app/'))).toEqual([]);
    });
  }

  it('shows nothing from the address it was asked for', () => {
    const { container } = mount('/missing-zz9-%3Cb%3Ebold%3C%2Fb%3E?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(container.textContent).not.toMatch(/zz9|bold|alert|script/);
    expect(container.querySelector('b')).toBeNull();
  });

  it('a known page is still that page, and a known in-app page keeps its own content', () => {
    expect(mount(pathOf('privacy', 'fr')).container.querySelector('.nf-hero')).toBeNull();
    cleanup();
    expect(mount(inAppPathOf('terms', 'ar')).container.querySelector('.nf-hero')).toBeNull();
  });

  it('the copy exists in all three languages and names no address', () => {
    for (const c of Object.values(CATALOGUE)) {
      for (const key of ['notFound.eyebrow', 'notFound.title', 'notFound.body', 'notFound.home', 'notFound.contact', 'notFound.suggestions', 'notFound.inApp.body', 'notFound.inApp.support'] as const) {
        expect(c[key]).toBeTruthy();
        expect(c[key]).not.toMatch(/https?:|\/\w/);
      }
    }
  });
});

describe('where the app frame applies', () => {
  it('every address under /in-app/, known or not, in every language — and nothing else', () => {
    for (const p of ['/in-app/', '/in-app/x', '/in-app/privacy', '/fr/in-app/x/y', '/ar/in-app/']) expect({ p, inApp: isInAppPath(p) }).toEqual({ p, inApp: true });
    // `/fr/in-app` has no slash after it: the host looks for its 404 in /fr/, the public French page.
    for (const p of ['/in-app', '/fr/in-app', '/in-apps/x', '/xin-app/x', '/de/in-app/x', '/privacy']) expect({ p, inApp: isInAppPath(p) }).toEqual({ p, inApp: false });
  });
});

describe('the head of the not-found page after a link inside the site', () => {
  it('drops the previous page’s canonical, alternates and description, and is never indexed', () => {
    document.head.innerHTML =
      '<meta name="description" content="x"><meta name="robots" content="index, follow"><link rel="canonical" href="https://tsxmr.com/about"><link rel="alternate" hreflang="fr" href="https://tsxmr.com/fr/about"><meta property="og:title" content="x">';
    applyNotFoundHead('Page not found — TSX-MR');
    expect(document.title).toBe('Page not found — TSX-MR');
    expect([...document.head.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute('content'))).toEqual(['noindex, nofollow']);
    expect(document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"], meta[name="description"], meta[property^="og:"]').length).toBe(0);
  });
});
