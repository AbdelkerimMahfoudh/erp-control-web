import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentProof, PlanQuote } from '../src/api/types';
import { I18nProvider } from '../src/i18n';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { PayFlow, receiversOf, type PendingRequest } from '../src/pages/portal/PayFlow';

/*
 * The one payment flow (owner, 2026-11-12): store(s), one action, the term, the server's line items and total, then the
 * manual-payment window — the service and number paid to (only pairs the server offers), the number paid from, the
 * screenshot. The page prices nothing and never sends an amount; a correction names its revision.
 */
const MAIN = '0192f000-0000-7000-8000-0000000000a1';
const KSAR = '0192f000-0000-7000-8000-0000000000a2';
const WAIT = '0192f000-0000-7000-8000-0000000000a3';
const line = (branchId: string, name: string, amount: number, pending = false) => ({ branchId, name, activity: 'electronics' as const, storeAmount: amount, paidSeats: 0, seatAmount: 0, amount, ...(pending ? { pending } : {}) });
const INSTRUCTIONS = {
  available: true,
  defaultProvider: 'bankily',
  providers: [
    { key: 'bankily', label: 'Bankily', code: '36963839', codes: ['36963839', '37676827'] },
    { key: 'sedad', label: 'Sedad', code: '36963839', codes: ['36963839', '37676827'] },
  ],
};
let stores: PlanQuote['lines'] = [];
let proofs: PaymentProof[] = [];
let asked: string[] = [];
let posts: { url: string; body: FormData | Record<string, unknown> }[] = [];

const plansFor = (url: string): { plans: PlanQuote[] } => {
  const only = /branches=([^&]+)/.exec(url)?.[1];
  const ids = only ? decodeURIComponent(only).split(',') : null;
  const lines = stores.filter((l) => !ids || ids.includes(l.branchId));
  return { plans: ([1, 3, 12] as const).map((m) => ({ months: m, lines: lines.map((l) => ({ ...l, amount: l.amount * (m === 1 ? 1 : m === 3 ? 2.5 : 25 / 3) })), total: lines.reduce((t, l) => t + l.amount * (m === 1 ? 1 : m === 3 ? 2.5 : 25 / 3), 0) })) };
};

beforeEach(() => {
  stores = [line(MAIN, 'Main', 600)];
  proofs = [];
  asked = [];
  posts = [];
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
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
      if (init?.method === 'POST') {
        const body = init.body instanceof FormData ? init.body : JSON.parse(String(init.body));
        posts.push({ url, body });
        if (url.endsWith('/store-requests')) {
          stores = [...stores, line(WAIT, 'Port', 600, true)];
          return json({ created: true, allocation: { id: WAIT } }, 201);
        }
        return json({ id: 'p-1' }, 201);
      }
      if (url.endsWith('/platform/my-subscription/payment-proofs')) return json(proofs);
      if (url.endsWith('/platform/payment-instructions')) return json(INSTRUCTIONS);
      if (url.includes('/platform/my-subscription/plans')) return json(plansFor(url));
      if (url.includes('/platform/my-subscription/payment-price')) return json({ price: { total: 100 * Number(/months=(\d+)/.exec(url)?.[1]) } });
      return json({ message: 'Not found' }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const flow = (landing: PendingRequest | null = null) =>
  render(
    <I18nProvider fixed="en">
      <PayFlow onChanged={() => undefined} landing={landing} />
    </I18nProvider>,
  );
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'pay.png', { type: 'image/png' });
const quoteBox = () => screen.getByTestId('pay-quote');

describe('the one payment flow', () => {
  it('a single store is chosen already; the server’s line items and total for the term; nothing priced on the page', async () => {
    flow();
    await waitFor(() => expect(within(quoteBox()).getByText('Main')).toBeTruthy());
    expect((screen.getAllByTestId('store-choice')[0]!.querySelector('input') as HTMLInputElement).checked).toBe(true);
    expect(within(quoteBox()).getAllByText(/600/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: en['portal.plans.months.3'] }));
    await waitFor(() => expect(within(quoteBox()).getAllByText(/1[\s,.  ]?500/).length).toBeGreaterThan(0));
    expect(asked.some((u) => u.includes(`plans?branches=${MAIN}&category=subscription`))).toBe(true);
  });

  it('a renewal may pay several stores; a seat is one store’s, priced by the server', async () => {
    stores = [line(MAIN, 'Main', 600), line(KSAR, 'Ksar', 600)];
    flow();
    await waitFor(() => expect(screen.getAllByTestId('store-choice')).toHaveLength(2));
    // Both chosen for a renewal, each a line.
    await waitFor(() => expect(within(quoteBox()).getByText('Ksar')).toBeTruthy());
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en['pay.action.seat']) }));
    await waitFor(() => expect(screen.getAllByRole('radio', { checked: true }).filter((r) => (r as HTMLInputElement).name === 'pay-store')).toHaveLength(1));
    await waitFor(() => expect(asked.some((u) => u.includes('payment-price?category=extra_seats&months=1&branches=') && u.endsWith('seats=1'))).toBe(true));
    expect(screen.getByText(en['pay.seat.team'])).toBeTruthy();
  });

  it('the window: only the pairs the server offers; the receiver, the payer number and the screenshot are required; the proof is sent — never an amount', async () => {
    flow();
    await waitFor(() => expect(within(quoteBox()).getByText('Main')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: en['pay.continue'] }));
    const dialog = document.querySelector('dialog')!;
    const choices = within(dialog).getAllByRole('radio');
    expect(choices.map((c) => (c as HTMLInputElement).value)).toEqual(['bankily:36963839', 'bankily:37676827', 'sedad:36963839', 'sedad:37676827']);
    expect(within(dialog).getAllByText('37 67 68 27')).toHaveLength(2);
    // Nothing chosen: refused on the page, nothing sent.
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.store.send'] }));
    expect(await within(dialog).findByText(en['pay.problem.receiver'])).toBeTruthy();
    fireEvent.click(choices[3]!);
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.store.send'] }));
    expect(await within(dialog).findByText(en['portal.store.problem.payer'])).toBeTruthy();
    fireEvent.change(dialog.querySelector('input[inputmode="tel"]')!, { target: { value: '+222 36 00 00 01' } });
    fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [png()] } });
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.store.send'] }));
    await waitFor(() => expect(posts).toHaveLength(1));
    const b = posts[0]!.body as FormData;
    expect(posts[0]!.url).toMatch(/\/platform\/my-subscription\/payment-proofs$/);
    expect([b.get('category'), b.get('months'), b.get('branches'), b.get('receiveService'), b.get('receiveNumber'), b.get('payerPhone')]).toEqual(['subscription', '1', MAIN, 'sedad', '37676827', '+222 36 00 00 01']);
    expect(b.get('file')).toBeInstanceOf(File);
    expect(b.get('amount')).toBeNull();
  });

  it('nothing offered yet: the window says so honestly, names no service or number, and cannot send', async () => {
    const empty = { available: false, defaultProvider: null, providers: [] };
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/platform/payment-instructions')) return json(empty);
      if (url.endsWith('/platform/my-subscription/payment-proofs')) return json([]);
      return json(plansFor(url));
    });
    flow();
    await waitFor(() => expect(within(quoteBox()).getByText('Main')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: en['pay.continue'] }));
    const dialog = document.querySelector('dialog')!;
    expect(within(dialog).getByText(en['account.payment.none'])).toBeTruthy();
    expect(within(dialog).queryAllByRole('radio')).toHaveLength(0);
    expect((within(dialog).getByRole('button', { name: en['portal.store.send'] }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a proof waiting: the flow says so; Correct sends the receiver and number with the revision it corrects', async () => {
    proofs = [{ id: 'p-9', companyId: 'c', status: 'submitted', amount: '600', paidAt: '2026-11-12T08:00:00.000Z', reference: null, payerPhone: '36000001', receiveService: 'bankily', receiveNumber: '36963839', revision: 2, revisedAt: null, note: null, contentType: 'image/png', byteSize: 4, refusalReason: null, months: 1, submittedAt: '2026-11-12T08:00:00.000Z', decidedAt: null, fileAvailable: true }];
    flow();
    expect(await screen.findByText(en['pay.waiting'])).toBeTruthy();
    expect(screen.queryByRole('button', { name: en['pay.continue'] })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en['pay.correct'] }));
    const dialog = document.querySelector('dialog')!;
    expect((within(dialog).getByDisplayValue('bankily:36963839') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(dialog).getAllByRole('radio')[1]!);
    fireEvent.click(within(dialog).getByRole('button', { name: en['portal.store.saveCorrection'] }));
    await waitFor(() => expect(posts).toHaveLength(1));
    const b = posts[0]!.body as FormData;
    expect(posts[0]!.url).toMatch(/payment-proofs\/p-9\/correct$/);
    expect([b.get('revision'), b.get('receiveService'), b.get('receiveNumber'), b.get('payerPhone')]).toEqual(['2', 'bankily', '37676827', '36000001']);
  });

  it('Add a store beside the stores: its names and activity are a request; then it is the store to activate', async () => {
    flow();
    await waitFor(() => expect(screen.getAllByTestId('store-choice')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: `+ ${en['pay.addStore']}` }));
    fireEvent.change(screen.getByLabelText(en['account.requests.store.name']), { target: { value: 'Port' } });
    fireEvent.change(screen.getByLabelText(en['portal.store.nameAr']), { target: { value: 'الميناء' } });
    fireEvent.click(screen.getByRole('button', { name: en['pay.addStore.submit'] }));
    await waitFor(() => expect(posts[0]).toMatchObject({ body: { name: 'Port', nameAr: 'الميناء', activity: 'electronics' } }));
    await waitFor(() => expect(screen.getByRole('radio', { name: new RegExp(en['pay.action.activate']) }).getAttribute('aria-checked')).toBe('true'));
    await waitFor(() => expect(asked.some((u) => u.includes(`plans?branches=${WAIT}&category=store_activation`))).toBe(true));
  });

  it('from the app’s link: the waiting store’s activation, or the seat for the person the Owner asked it for — read from the server', async () => {
    stores = [line(MAIN, 'Main', 600), line(WAIT, 'Port', 600, true)];
    flow({ id: WAIT, kind: 'store', label: 'Port', labelAr: null, activity: 'electronics', store: null, person: null, monthlyAmount: 600 });
    await waitFor(() => expect(asked.some((u) => u.includes(`plans?branches=${WAIT}&category=store_activation`))).toBe(true));
    cleanup();
    flow({ id: 'seat-1', kind: 'seat', label: null, labelAr: null, activity: null, store: { id: MAIN, name: 'Main' }, person: { name: 'Aïcha' }, monthlyAmount: 100 });
    expect(await screen.findByText(en['pay.seat.for'].replace('{name}', 'Aïcha'))).toBeTruthy();
    await waitFor(() => expect(asked.some((u) => u.includes(`branches=${MAIN}&seats=1`))).toBe(true));
  });

  it('the receivers are the server’s pairs; the words in three languages; the address never carries a request', () => {
    expect(receiversOf({ available: true, defaultProvider: null, providers: [{ key: 'bankily', label: 'Bankily', code: '1' }] }).map((r) => r.number)).toEqual(['1']);
    expect(receiversOf(null)).toEqual([]);
    for (const cat of [en, fr, ar]) expect(cat['pay.window.where'] && cat['pay.action.seat'] && cat['pay.addStore']).toBeTruthy();
    expect(fr['pay.addStore']).toBe('Ajouter une boutique');
    const src = readFileSync('src/pages/portal/PayFlow.tsx', 'utf8') + readFileSync('src/pages/portal/Subscription.tsx', 'utf8');
    expect(src).not.toMatch(/URLSearchParams|location\.search|useLocation/);
    expect(src).toContain('platform/my-subscription/pending/');
  });
});

describe('the payment window’s numbers and file', () => {
  it('each number has its own copy button: named for screen readers, copies the eight digits without spaces, says Copied; choosing is untouched', async () => {
    const written: string[] = [];
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async (v: string) => void written.push(v)) } });
    flow();
    await waitFor(() => expect(within(quoteBox()).getByText('Main')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: en['pay.continue'] }));
    const dialog = document.querySelector('dialog')!;
    const copies = within(dialog).getAllByRole('button', { name: /^Copy / });
    expect(copies.map((b) => b.getAttribute('aria-label'))).toEqual(['Copy 36 96 38 39', 'Copy 37 67 68 27', 'Copy 36 96 38 39', 'Copy 37 67 68 27']);
    copies[1]!.focus();
    fireEvent.click(copies[1]!);
    await waitFor(() => expect(written).toEqual(['37676827']));
    expect(await within(copies[1]!).findByText(en['portal.pay.copied'])).toBeTruthy();
    // Copying chose nothing.
    expect(within(dialog).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    // The payer's own number stays international.
    expect((dialog.querySelector('input[inputmode="tel"]') as HTMLInputElement).placeholder).toBe('+222');
  });

  it('the file: a real button opens the chooser; the name chosen is shown and announced with it', async () => {
    flow();
    await waitFor(() => expect(within(quoteBox()).getByText('Main')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: en['pay.continue'] }));
    const dialog = document.querySelector('dialog')!;
    const choose = within(dialog).getByRole('button', { name: en['pay.file.choose'] });
    expect(choose.getAttribute('aria-describedby')).toBe('pay-file-name');
    expect(within(dialog).getByText(en['pay.file.none'])).toBeTruthy();
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const opened = vi.spyOn(input, 'click');
    fireEvent.click(choose);
    expect(opened).toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File([new Uint8Array([0x89])], 'reçu bankily.png', { type: 'image/png' })] } });
    expect(within(dialog).getByText('reçu bankily.png')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: en['pay.file.change'] })).toBeTruthy();
    // Send and Cancel together, centred.
    expect(dialog.querySelector('.pay-actions')!.children).toHaveLength(2);
  });
});
