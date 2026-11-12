import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentProof } from '../src/api/types';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { BusinessProofs } from '../src/pages/admin/BusinessProofs';

/*
 * Owner, 2026-11-12: a proof is viewed without downloading it — an approved or refused one too — in the business's
 * payment history. Read-only (nothing decides there), fetched only when opened, the latest revision, Download apart.
 */
const asked: string[] = [];
beforeEach(() => {
  asked.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      asked.push(String(input));
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BodyInit, { status: 200, headers: { 'Content-Type': 'image/png' } });
    }),
  );
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:proof'), revokeObjectURL: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const proof = (over: Partial<PaymentProof>): PaymentProof => ({
  id: 'p-1',
  companyId: 'c-1',
  status: 'approved',
  amount: '1500',
  paidAt: '2026-11-07T10:00:00.000Z',
  reference: null,
  note: null,
  contentType: 'image/png',
  fileName: 'payment-proof-2026-11-07-01a1b807.png',
  byteSize: 121623,
  refusalReason: null,
  months: 3,
  submittedAt: '2026-11-07T10:00:00.000Z',
  decidedAt: '2026-11-07T11:00:00.000Z',
  fileAvailable: true,
  revision: 1,
  ...over,
});

const view = (proofs: PaymentProof[]) =>
  render(
    <I18nProvider fixed="en">
      <BusinessProofs proofs={proofs} />
    </I18nProvider>,
  );

describe('a business’s payment proofs in the console', () => {
  it('an approved proof: listed with its decision, opened in place on request — the latest revision — with Download apart', async () => {
    view([proof({ revision: 2 })]);
    expect(screen.getByText(en['portal.proof.status.approved'])).toBeTruthy();
    // Nothing is fetched until it is opened.
    expect(asked).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: en['admin.proofs.view'] }));
    expect(await screen.findByRole('img', { name: en['admin.proofs.imageAlt'] })).toBeTruthy();
    expect(asked[0]).toMatch(/platform\/payment-proofs\/p-1\/file\?r=2$/);
    expect(screen.getByRole('link', { name: en['admin.proofs.download'] }).getAttribute('download')).toBe('payment-proof-2026-11-07-01a1b807.png');
    fireEvent.click(screen.getByRole('button', { name: en['admin.proofs.hide'] }));
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('a refused proof says why; a purged one says it is gone and offers nothing to open; none says so', () => {
    view([proof({ id: 'p-2', status: 'refused', refusalReason: 'Wrong amount' }), proof({ id: 'p-3', fileAvailable: false })]);
    expect(screen.getByText(en['admin.proofs.refusedBecause'].replace('{reason}', 'Wrong amount'))).toBeTruthy();
    expect(screen.getByText(en['admin.proofs.purged'])).toBeTruthy();
    expect(screen.getAllByRole('button', { name: en['admin.proofs.view'] })).toHaveLength(1);
    cleanup();
    view([]);
    expect(screen.getByText(en['admin.proofs.none'])).toBeTruthy();
  });

  it('read-only: nothing on it approves or refuses; the business page reads the business’s proofs, every decision', () => {
    const src = readFileSync('src/pages/admin/BusinessProofs.tsx', 'utf8');
    expect(src).not.toMatch(/\/approve|\/refuse|method: 'POST'/);
    expect(readFileSync('src/pages/admin/Business.tsx', 'utf8')).toContain('platform/payment-proofs?company=');
  });
});
