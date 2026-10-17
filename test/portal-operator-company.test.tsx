import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Company mode, kept for when a company is formed (the brief "Final Legal, Identity, Portal and Website Production
 * Preparation"): the same pages name the company, its legal form, its RCCM number and its registered address, and say
 * TSX-MR is its trading name. Nothing of the individual operator remains.
 */
vi.mock('../src/config/site', async (original) => {
  const real = await original<typeof import('../src/config/site')>();
  return {
    ...real,
    SITE: Object.freeze({
      ...real.SITE,
      operatorType: 'company',
      legalName: 'Registered Name SARL',
      legalForm: 'SARL',
      registrationNumber: 'RC 0000',
      address: 'Street 1',
      addressAr: '',
    }),
  };
});

const { App } = await import('../src/app');
const { I18nProvider } = await import('../src/i18n');
const { ThemeProvider } = await import('../src/theme/theme');
const { pathOf } = await import('../src/site/routes');

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

describe('the portal’s texts under a company', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('the legal notice: the trading name of the company, its legal form, RCCM and registered address', () => {
    const { container } = mount(pathOf('legalNotice', 'en'));
    const text = container.textContent ?? '';
    expect(text).toContain('TSX-MR is a trading name of Registered Name SARL.');
    const details = container.querySelector('.org-details')?.textContent ?? '';
    for (const fact of ['Legal form', 'SARL', 'RC 0000', 'Street 1, Nouakchott, Mauritania']) expect(details).toContain(fact);
    // Nothing describes an individual operator. The person responsible for publication is a person in either mode: it
    // keeps its default until a company designates someone else.
    expect(text).not.toMatch(/an individual|not a separately incorporated|Operated by/);
    expect(text).toContain('The person responsible for publication is Abdel Kerim Taleb Ould Sidi.');
  });

  it('the footer gives the company’s registered details', () => {
    const { container } = mount(pathOf('home', 'en'));
    expect(container.querySelector('.chrome-footer')?.textContent).toContain('Registered Name SARL · SARL · RC 0000');
  });
});
