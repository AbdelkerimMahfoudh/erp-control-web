import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentProof, SeatRequest } from '../src/api/types';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';
import { openProofFor, payerPhoneValid } from '../src/pages/portal/StorePayment';

/*
 * 0135 (owner, 2026-11-11): a waiting store is paid from its status: the server's price, the payment numbers, the number
 * paid from and the screenshot; then, waiting for confirmation, the number or the screenshot can be corrected — sent
 * with the revision it corrects. The page computes no price and never sends an amount.
 */
const STORE: SeatRequest = { id: 'a1b2c3d4-0000-7000-8000-000000000001', kind: 'store', status: 'pending_payment', store: null, person: null, label: 'Test-boutique', monthlyAmount: 600, currency: 'MRU', requestedBy: 'owner', requestedAt: '2026-11-11T04:40:00.000Z', confirmedBy: null } as never;
const INSTRUCTIONS = { available: true, defaultProvider: 'p1', providers: [{ key: 'p1', label: 'Service One', code: '36963839' }] };
const OPEN: PaymentProof = { id: 'p-1', companyId: 'c', status: 'submitted', lines: [{ branchId: STORE.id, name: 'Test-boutique', amount: 600, pending: true }], category: 'store_activation', amount: '600', paidAt: '2026-11-11T05:00:00.000Z', reference: null, payerPhone: '36000001', revision: 2, revisedAt: '2026-11-11T05:10:00.000Z', note: null, contentType: 'image/png', byteSize: 4, refusalReason: null, months: 1, submittedAt: '2026-11-11T05:00:00.000Z', decidedAt: null, fileAvailable: true };
let posts: { url: string; body: FormData }[] = [];

beforeEach(() => {
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
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('/platform/my-subscription/payment-price')) {
        const m = Number(/months=(\d+)/.exec(url)?.[1]);
        return json({ category: 'store_activation', price: { months: m, total: { 1: 600, 3: 1500, 12: 5000 }[m] } });
      }
      if (init?.method === 'POST') {
        posts.push({ url, body: init.body as FormData });
        return json(OPEN, url.endsWith('/correct') ? 200 : 201);
      }
      return json({ message: 'Not found' }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'pay.png', { type: 'image/png' });

describe('a waiting store paid from the portal', () => {
  it('a store’s open proof is the one naming it; the payer number rule matches the server’s; store words in three languages', () => {
    expect(openProofFor(STORE.id, [OPEN])?.id).toBe('p-1');
    expect(openProofFor(STORE.id, [{ ...OPEN, status: 'approved' }])).toBeNull();
    expect(openProofFor('other', [OPEN])).toBeNull();
    expect(payerPhoneValid('+222 36-00.00 01')).toBe(true);
    expect(payerPhoneValid('abc')).toBe(false);
    expect(en['portal.store.payTitle']).toMatch(/store/);
    expect(fr['portal.store.payTitle']).toMatch(/boutique/);
    expect(ar['portal.store.payTitle']).toMatch(/المتجر/);
    // 0132: a store added in the app opens on approval, even during the free trial; the window says so.
    expect(readFileSync('src/pages/portal/PayFlow.tsx', 'utf8')).toContain("t('trial.addons.appStoreOpens')");
    expect(en['trial.addons.appStoreOpens']).toMatch(/as soon as we confirm.*even while your free trial/);
    expect(fr['portal.store.waitingConfirmation']).toBe('En attente de confirmation');
    for (const d of [en, fr, ar]) expect(JSON.stringify(d)).not.toMatch(/succursale/);
  });
});
