import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app';
import { I18nProvider, LANGUAGE_STORAGE_KEY } from '../src/i18n';
import { ThemeProvider } from '../src/theme/theme';

const PLAN = { version: 2, branchMonthly: 500, includedSeatsPerStore: 1, extraSeatMonthly: 100, currency: 'MRU', effectiveFrom: '2026-10-05T00:00:00.000Z', upcoming: null };
const QUOTE = {
  branchMonthly: 500,
  extraStaffMonthly: 100,
  includedSeatsPerStore: 1,
  activeBranchCount: 2,
  activeStaffCount: 3,
  includedStaffCount: 2,
  paidSeatCount: 1,
  grantedSeatCount: 0,
  chargeableStaffCount: 1,
  branchFee: 1000,
  staffFee: 100,
  monthlyTotal: 1100,
  currency: 'MRU',
  lines: [
    { branchId: null, name: 'Store 1', staffCount: 2, includedSeats: 1, paidSeats: 1, grantedSeats: 0, seatLimit: 2, seatsAvailable: 0, overLimit: false, seatFee: 100 },
    { branchId: null, name: 'Store 2', staffCount: 1, includedSeats: 1, paidSeats: 0, grantedSeats: 0, seatLimit: 1, seatsAvailable: 0, overLimit: false, seatFee: 0 },
  ],
};

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/platform/plan')) return json(PLAN);
    if (url.endsWith('/platform/quote')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { stores: number[] };
      expect(body.stores).toEqual([2, 1]);
      return json(QUOTE);
    }
    if (url.endsWith('/platform/my-subscription') || url.endsWith('/platform/admin/me')) return json({ message: 'Unauthorized' }, 401);
    return json({ message: `unexpected ${url}` }, 500);
  });
}

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

describe('the public site', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', mockFetch());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the price list from the server and the estimate the server returns (on the Dukan ERP page)', async () => {
    mount('/products/dukan-erp');
    expect(await screen.findByText(/500 MRU/)).toBeTruthy();
    const inputs = screen.getAllByLabelText(/Employees/);
    expect(inputs).toHaveLength(1);
    await act(async () => {
      (await screen.findByRole('button', { name: 'Add a store' })).click();
    });
    const user = userEvent.setup();
    const fields = screen.getAllByLabelText(/Employees/) as HTMLInputElement[];
    await user.clear(fields[0]!);
    await user.type(fields[0]!, '2');
    await user.clear(fields[1]!);
    await user.type(fields[1]!, '1');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    // 1 100 is what the SERVER said; the page added nothing up.
    expect(await screen.findByText(/1,100 MRU|1\s100 MRU|1 100 MRU/)).toBeTruthy();
  });

  it('moves to the same page in Arabic, mirrors the document and keeps the language across visits', async () => {
    mount('/products/dukan-erp');
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
    expect(await screen.findByText('الأسعار')).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Français' }));
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('shows the sign-in form on the account page when the API answers 401, and nothing from storage', async () => {
    mount('/account');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(Object.keys(localStorage).filter((k) => !k.startsWith('erp.web.'))).toEqual([]);
  });

  it('shows the administrator sign-in on /admin when no session exists', async () => {
    mount('/admin');
    expect(await screen.findByText(/Platform administrators only/)).toBeTruthy();
  });
});
