import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPERATOR_REGISTRATION, readInputs, releaseProblems } from '../src/config/schema';
import { postalAddress } from '../src/components/public/RichText';
import { App } from '../src/app';
import { I18nProvider, storeLanguage } from '../src/i18n';
import { ThemeProvider } from '../src/theme/theme';
import { pathOf } from '../src/site/routes';

/**
 * The portal (a full build) under an individual operator (the brief "Final Legal, Identity, Portal and Website
 * Production Preparation", 2026-10-17). TSX-MR is a trading name operated by one person, with no company. The portal's
 * texts say so, and its gate asks for no legal form or RCCM. It keeps the question an individual cannot settle alone:
 * whether paid access may be sold before the operator registers. Company mode stays as strict as before.
 */

const NAME = 'Abdel Kerim Taleb Ould Sidi';

/** A full build with everything but the identity given: what is left is what the operator type decides. */
const SERVICE: Record<string, string> = {
  VITE_PUBLIC_SITE_ORIGIN: 'https://www.company-domain.mr',
  VITE_API_BASE: 'https://api.company-domain.mr/api/v1',
  VITE_SUPPORT_HOURS: 'Sunday to Thursday, 9:00 to 17:00 (Nouakchott time)',
  VITE_SUPPORT_RESPONSE_TIME: 'Within two working days',
  VITE_SUPPORT_LANGUAGES: 'Arabic, French and English',
  VITE_ACCOUNT_DELETION_CHANNEL: 'whatsapp',
  VITE_LEGAL_EFFECTIVE_DATE: '2026-11-01',
};
const COMPANY = {
  VITE_OPERATOR_TYPE: 'company',
  VITE_ORGANIZATION_LEGAL_NAME: 'Registered Name SARL',
  VITE_ORGANIZATION_LEGAL_FORM: 'SARL',
  VITE_ORGANIZATION_REGISTRATION_NUMBER: 'RC 0000',
  VITE_ORGANIZATION_ADDRESS: 'Street 1',
};
const codes = (env: Record<string, string>) => releaseProblems(env, []).map((p) => `${p.env ?? p.detail.split(':')[0]}:${p.problem}`);

describe('the PORTAL gate, by operator type', () => {
  it('an individual: no legal form or RCCM is asked for, and the registration question stays open', () => {
    expect(codes(SERVICE)).toEqual([`${OPERATOR_REGISTRATION.id}:legal_blocker`]);
    expect(OPERATOR_REGISTRATION.summary).toMatch(/counsel/);
  });

  it('an individual: a legal form or an RCCM number is refused, never published for a company that does not exist', () => {
    expect(codes({ ...SERVICE, VITE_ORGANIZATION_LEGAL_FORM: 'SARL', VITE_ORGANIZATION_REGISTRATION_NUMBER: 'RC 0000' })).toEqual([
      'VITE_ORGANIZATION_LEGAL_FORM:forbidden',
      'VITE_ORGANIZATION_REGISTRATION_NUMBER:forbidden',
      `${OPERATOR_REGISTRATION.id}:legal_blocker`,
    ]);
  });

  it('a company: as strict as before — its own name, form, RCCM and registered address; no individual blocker', () => {
    expect(codes({ ...SERVICE, ...COMPANY })).toEqual([]);
    expect(codes({ ...SERVICE, VITE_OPERATOR_TYPE: 'company' })).toEqual([
      'VITE_ORGANIZATION_LEGAL_NAME:missing',
      'VITE_ORGANIZATION_LEGAL_FORM:missing',
      'VITE_ORGANIZATION_REGISTRATION_NUMBER:missing',
      'VITE_ORGANIZATION_ADDRESS:missing',
    ]);
  });

  it('the person responsible for publication is required by both gates, and defaults to the operator', () => {
    expect(readInputs({}, 'production').inputs.publicationDirector).toBe(NAME);
    expect(codes({ ...SERVICE, ...COMPANY, VITE_PUBLICATION_DIRECTOR: '[TO BE PROVIDED]' })).toEqual(['VITE_PUBLICATION_DIRECTOR:placeholder']);
  });
});

describe('the correspondence address', () => {
  it('defaults to the address the owner gave, in Latin and Arabic script', () => {
    const { inputs } = readInputs({}, 'production');
    expect([inputs.address, inputs.addressAr]).toEqual(['Tevragh Zeina, Nouakchott-Ouest', 'تفرغ زينة، نواكشوط الغربية']);
  });

  it('a configured address replaces it without a code change; with no Arabic line of its own, Arabic shows it in Latin script', () => {
    expect(readInputs({ VITE_ORGANIZATION_ADDRESS: 'Ksar, Nouakchott-Ouest' }, 'production').inputs.addressAr).toBe('');
    expect(readInputs({ VITE_ORGANIZATION_ADDRESS: 'Ksar, Nouakchott-Ouest', VITE_ORGANIZATION_ADDRESS_AR: 'لكصر، نواكشوط الغربية' }, 'production').inputs.addressAr).toBe('لكصر، نواكشوط الغربية');
  });

  it('a company never inherits the person’s name or address', () => {
    const { inputs } = readInputs({ VITE_OPERATOR_TYPE: 'company' }, 'production');
    expect([inputs.legalName, inputs.address, inputs.addressAr]).toEqual(['', '', '']);
    expect(readInputs({ VITE_OPERATOR_TYPE: 'company' }, 'preview').filled).toEqual(expect.arrayContaining(['legalName', 'address']));
  });

  it('reads as one line in the reader’s language: the city only when the line does not already name it', () => {
    const parts = { address: 'Tevragh Zeina, Nouakchott-Ouest', addressAr: 'تفرغ زينة، نواكشوط الغربية' };
    expect(postalAddress('en', { ...parts, city: 'Nouakchott', country: 'Mauritania' })).toBe('Tevragh Zeina, Nouakchott-Ouest, Mauritania');
    expect(postalAddress('fr', { ...parts, city: 'Nouakchott', country: 'Mauritanie' })).toBe('Tevragh Zeina, Nouakchott-Ouest, Mauritanie');
    expect(postalAddress('ar', { ...parts, city: 'نواكشوط', country: 'موريتانيا' })).toBe('تفرغ زينة، نواكشوط الغربية، موريتانيا');
    expect(postalAddress('ar', { ...parts, addressAr: '', city: 'نواكشوط', country: 'موريتانيا' })).toBe('Tevragh Zeina, Nouakchott-Ouest، نواكشوط، موريتانيا');
    expect(postalAddress('en', { address: 'Street 1', addressAr: '', city: 'Nouakchott', country: 'Mauritania' })).toBe('Street 1, Nouakchott, Mauritania');
    expect(postalAddress('en', { address: '', addressAr: '', city: '', country: 'Mauritania' })).toBe('');
  });
});

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

describe('the portal’s own texts under the individual operator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('the legal notice names the operator as an individual and the person responsible for publication — no pending mark, no company detail', () => {
    const { container } = mount(pathOf('legalNotice', 'en'));
    const text = container.textContent ?? '';
    expect(text).toContain(`it is operated by ${NAME}, an individual.`);
    expect(text).toContain(`The person responsible for publication is ${NAME}.`);
    expect(container.querySelector('[data-blocker="publisher"]')).toBeNull();
    expect(text).not.toMatch(/Legal form|Registration number|trading as/);
    expect(container.querySelector('.org-details')?.textContent).toContain('Tevragh Zeina, Nouakchott-Ouest, Mauritania');
  });

  it('the service privacy policy names who is responsible and the address, with no legal form or RCCM left to fill', () => {
    const { container } = mount(pathOf('privacy', 'en'));
    expect(container.textContent).toContain('Correspondence address: Tevragh Zeina, Nouakchott-Ouest, Mauritania.');
    for (const name of ['legalForm', 'registrationNumber', 'address', 'city']) expect(container.querySelector(`[data-input="${name}"]`)).toBeNull();
  });

  it('in Arabic, the address is the Arabic line the owner gave, and the footer shows it too', () => {
    storeLanguage('ar');
    const { container } = mount(pathOf('privacy', 'ar'));
    expect(container.textContent).toContain('عنوان المراسلة: تفرغ زينة، نواكشوط الغربية، موريتانيا.');
    expect(container.querySelector('.chrome-footer')?.textContent).toContain('تفرغ زينة، نواكشوط الغربية، موريتانيا');
  });

  it('the about page says who operates the name instead of listing company details', () => {
    const { container } = mount(pathOf('about', 'fr'));
    expect(container.textContent).toContain('Qui exploite TSX-MR');
    expect(container.textContent).not.toContain('Informations sur la société');
  });
});
