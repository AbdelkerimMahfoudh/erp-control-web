import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { PaymentProofs } from '../src/pages/portal/PaymentProofs';

/*
 * 0134 (owner, 2026-11-08): the Owner sees the price list and says what a payment is for — a subscription, a new
 * store's activation, extra seats or something else. Every figure is the server's: the page computes no price.
 */
const LINE = { branchId: 'a', name: 'Tevragh Zeina', activity: 'electronics', storeAmount: 600, paidSeats: 0, seatAmount: 0, amount: 600 };
const PLANS = {
  prices: {
    currency: 'MRU',
    months: [1, 3, 12],
    electronics: { '1': 600, '3': 1500, '12': 5000 },
    moneyAgentMonthly: 300,
    bothMonthly: 800,
    seatMonthly: 100,
    table: {
      electronics: { '1': 600, '3': 1500, '12': 5000 },
      money_agent: { '1': 300, '3': 900, '12': 3600 },
      both: { '1': 800, '3': 2400, '12': 9600 },
      seat: { '1': 100, '3': 300, '12': 1200 },
    },
    categories: ['subscription', 'store_activation', 'extra_seats', 'other'],
  },
  plans: [
    { months: 1, total: 600, lines: [LINE] },
    { months: 3, total: 1500, lines: [{ ...LINE, storeAmount: 1500, amount: 1500 }] },
    { months: 12, total: 5000, lines: [{ ...LINE, storeAmount: 5000, amount: 5000 }] },
  ],
};
const INSTRUCTIONS = { available: true, placeholder: false, defaultProvider: 'p1', providers: [{ key: 'p1', label: 'Service One', order: 1, enabled: true, code: '36963839', placeholder: false }] };
let posted: FormData | null = null;
const asked: string[] = [];

beforeEach(() => {
  posted = null;
  asked.length = 0;
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      asked.push(url);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      const path = url.split('?')[0]!;
      if (path.endsWith('/platform/my-subscription/plans')) return json(PLANS);
      if (path.endsWith('/platform/my-subscription/payment-price')) {
        const months = Number(/months=(\d+)/.exec(url)?.[1]);
        const seats = Number(/seats=(\d+)/.exec(url)?.[1]);
        return json({ category: 'extra_seats', price: { months, seats, total: { 1: 100, 3: 300, 12: 1200 }[months]! * seats, stores: [{ branchId: 'a', amount: 0 }] } });
      }
      if (path.endsWith('/platform/payment-instructions')) return json(INSTRUCTIONS);
      if (path.endsWith('/platform/my-subscription/payment-proofs') && init?.method === 'POST') {
        posted = init.body as FormData;
        return json({ id: 'x', status: 'submitted', amount: '600.00', paidAt: '2026-11-08T10:00:00.000Z', months: 3, refusalReason: null }, 201);
      }
      if (path.endsWith('/platform/my-subscription/payment-proofs')) return json([]);
      return json({ message: 'Not found' }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const pay = async () => {
  const dialog = document.querySelector('dialog')!;
  await waitFor(() => expect(dialog.hasAttribute('open')).toBe(true));
  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'pay.png', { type: 'image/png' });
  fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [file] } });
  fireEvent.click(within(dialog).getByRole('button', { name: en['portal.pay.confirm'] }));
  await waitFor(() => expect(posted).not.toBeNull());
};

describe('0134: the price list and what a payment is for', () => {
  it('shows the server’s price list — 600 / 1 500 / 5 000 for an electronics store, 800 a month for both', async () => {
    render(<I18nProvider fixed="en"><PaymentProofs onChanged={() => undefined} /></I18nProvider>);
    const table = await screen.findByTestId('price-list');
    const rows = [...table.querySelectorAll('tbody tr')].map((r) => r.textContent ?? '');
    expect(rows[0]).toMatch(/600[\s\S]*1[\s,.  ]?500[\s\S]*5[\s,.  ]?000/);
    expect(rows[2]).toMatch(/800/);
    expect(rows[3]).toMatch(/100/);
  });

  it('offers the categories, and a subscription is sent as one — never with an amount', async () => {
    render(<I18nProvider fixed="en"><PaymentProofs onChanged={() => undefined} /></I18nProvider>);
    const choices = await screen.findByTestId('payment-category');
    // No store waits for activation here, so that choice is not offered.
    expect(within(choices).getAllByRole('radio')).toHaveLength(3);
    expect(asked.some((u) => u.includes('plans?category=subscription'))).toBe(true);
    const cards = [...document.querySelectorAll('.plan')] as HTMLElement[];
    fireEvent.click(within(cards[1]!).getByRole('button', { name: en['portal.plans.choose'] }));
    await pay();
    expect(posted!.get('category')).toBe('subscription');
    expect(posted!.get('months')).toBe('3');
    expect(posted!.get('amount')).toBeNull();
  });

  it('extra seats: the server prices them; the store, seats and months are sent, never an amount', async () => {
    render(<I18nProvider fixed="en"><PaymentProofs onChanged={() => undefined} /></I18nProvider>);
    const choices = await screen.findByTestId('payment-category');
    fireEvent.click(within(choices).getByLabelText(en['payment.category.extra_seats']));
    const block = await screen.findByTestId('extra-seats');
    fireEvent.change(within(block).getByRole('combobox'), { target: { value: 'a' } });
    fireEvent.change(within(block).getByRole('spinbutton'), { target: { value: '2' } });
    await waitFor(() => expect(asked.some((u) => u.includes('payment-price?category=extra_seats&months=3&branches=a&seats=2'))).toBe(true));
    const cards = [...block.querySelectorAll('.plan')] as HTMLElement[];
    await waitFor(() => expect(cards[1]!.querySelector('.plan-total')!.textContent).toMatch(/600/));
    fireEvent.click(within(cards[1]!).getByRole('button', { name: en['portal.plans.choose'] }));
    await pay();
    expect(posted!.get('category')).toBe('extra_seats');
    expect(posted!.get('branches')).toBe('a');
    expect(posted!.get('seats')).toBe('2');
    expect(posted!.get('months')).toBe('3');
    expect(posted!.get('amount')).toBeNull();
  });
});
