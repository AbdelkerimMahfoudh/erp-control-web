import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { PaymentProofs } from '../src/pages/portal/PaymentProofs';

/*
 * The Owner chooses a plan and pays (owner, 2026-11-05): 1, 3 or 12 months priced by the server per store; a dialog with
 * each offered number and its copy button; a screenshot; Confirm payment sends the plan and the file — never an amount.
 */
const PLANS = {
  plans: [
    { months: 1, total: 1400, lines: [{ branchId: 'a', name: 'Tevragh Zeina', activity: 'electronics', storeAmount: 600, paidSeats: 0, seatAmount: 0, amount: 600 }, { branchId: 'b', name: 'Ksar', activity: 'both', storeAmount: 800, paidSeats: 0, seatAmount: 0, amount: 800 }] },
    { months: 3, total: 3900, lines: [{ branchId: 'a', name: 'Tevragh Zeina', activity: 'electronics', storeAmount: 1500, paidSeats: 0, seatAmount: 0, amount: 1500 }, { branchId: 'b', name: 'Ksar', activity: 'both', storeAmount: 2400, paidSeats: 0, seatAmount: 0, amount: 2400 }] },
    { months: 12, total: 14600, lines: [{ branchId: 'a', name: 'Tevragh Zeina', activity: 'electronics', storeAmount: 5000, paidSeats: 0, seatAmount: 0, amount: 5000 }, { branchId: 'b', name: 'Ksar', activity: 'both', storeAmount: 9600, paidSeats: 0, seatAmount: 0, amount: 9600 }] },
  ],
};
const INSTRUCTIONS = {
  available: true,
  placeholder: false,
  defaultProvider: 'p1',
  providers: [
    { key: 'p1', label: 'Service One', order: 1, enabled: true, code: '36963839', placeholder: false },
    { key: 'p2', label: 'Service Two', order: 3, enabled: true, code: '36963839', placeholder: false },
  ],
};
let posted: FormData | null = null;
let proofs: unknown[] = [];

beforeEach(() => {
  posted = null;
  proofs = [];
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/platform/my-subscription/plans')) return json(PLANS);
      if (url.endsWith('/platform/payment-instructions')) return json(INSTRUCTIONS);
      if (url.endsWith('/platform/my-subscription/payment-proofs') && init?.method === 'POST') {
        posted = init.body as FormData;
        proofs = [{ id: 'x', status: 'submitted', amount: '3900.00', paidAt: '2026-11-05T10:00:00.000Z', months: 3, refusalReason: null }];
        return json(proofs[0], 201);
      }
      if (url.endsWith('/platform/my-subscription/payment-proofs')) return json(proofs);
      return json({ message: 'Not found' }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the Owner’s plans on the portal', () => {
  it('three plans, each with the server’s total and every store’s line', async () => {
    render(<I18nProvider fixed="en"><PaymentProofs onChanged={() => undefined} /></I18nProvider>);
    await screen.findByText(en['portal.plans.months.3']);
    const cards = [...document.querySelectorAll('.plan')] as HTMLElement[];
    expect(cards.map((c) => c.dataset.months)).toEqual(['1', '3', '12']);
    expect(within(cards[1]!).getByText('Tevragh Zeina')).toBeTruthy();
    expect(within(cards[1]!).getByText('Ksar')).toBeTruthy();
    expect(cards[1]!.querySelector('.plan-total')!.textContent).toMatch(/3[\s,.  ]?900/);
  });

  it('choosing one opens the payment dialog: each number with its copy button; Confirm sends the plan and the screenshot', async () => {
    const onChanged = vi.fn();
    render(<I18nProvider fixed="en"><PaymentProofs onChanged={onChanged} /></I18nProvider>);
    await screen.findByText(en['portal.plans.months.3']);
    const cards = [...document.querySelectorAll('.plan')] as HTMLElement[];
    fireEvent.click(within(cards[1]!).getByRole('button', { name: en['portal.plans.choose'] }));
    const dialog = document.querySelector('dialog')!;
    await waitFor(() => expect(dialog.hasAttribute('open')).toBe(true));
    expect(within(dialog).getAllByText('36963839')).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.pay.copy'].replace('{provider}', 'Service One') }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('36963839'));
    // Without a screenshot, nothing is sent.
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.pay.confirm'] }));
    expect(await within(dialog).findByText(en['portal.proof.problem.file'])).toBeTruthy();
    expect(posted).toBeNull();
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'pay.png', { type: 'image/png' });
    fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.pay.confirm'] }));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted!.get('months')).toBe('3');
    expect(posted!.get('amount')).toBeNull();
    expect(posted!.get('file')).toBeInstanceOf(File);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    // Waiting for review now: no plan to choose until it is decided.
    expect(await screen.findByText(en['portal.proof.waiting'])).toBeTruthy();
    expect(document.querySelectorAll('.plan')).toHaveLength(0);
  });
});
