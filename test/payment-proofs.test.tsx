import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

const KEYS = [
  'portal.proof.title',
  'portal.proof.status.submitted',
  'portal.proof.status.under_review',
  'portal.proof.status.approved',
  'portal.proof.status.refused',
  'portal.proof.refused',
  'admin.proofs.approve',
  'admin.proofs.refuse',
] as const;

describe('payment proofs on the web (D227)', () => {
  it('are worded in all three languages, and the refusal carries its reason', () => {
    for (const catalogue of [en, fr, ar]) {
      for (const key of KEYS) expect(catalogue[key]).toBeTruthy();
      expect(catalogue['portal.proof.refused']).toContain('{reason}');
    }
  });

  it('a stopped approval is settled from what is recorded, and the amount cannot be changed there', () => {
    for (const catalogue of [en, fr, ar]) {
      for (const k of ['running', 'stopped', 'paymentYes', 'paymentNo', 'periodYes', 'periodNo', 'complete', 'finish', 'closeWithoutPeriod', 'release'] as const) {
        expect(catalogue[`admin.proofs.recovery.${k}`]).toBeTruthy();
      }
    }
    const page = readFileSync('src/pages/admin/Proofs.tsx', 'utf8');
    expect(page).toMatch(/proof\.applying \? \(\s*<Recovery/);
    const recovery = page.slice(page.indexOf('function Recovery'));
    expect(recovery).toContain('state.actions.release ?');
    expect(recovery).not.toMatch(/amount:\s*form/);
  });

  it('the portal only sends; nothing here may decide access', () => {
    const portal = readFileSync('src/pages/portal/PayFlow.tsx', 'utf8');
    expect(portal).toContain('platform/my-subscription/payment-proofs');
    expect(portal).not.toMatch(/payment-proofs\/[^'"]*(approve|refuse|confirm)/);
  });

  it('a file goes as a form with its own boundary, never as JSON', () => {
    const client = readFileSync('src/api/client.ts', 'utf8');
    expect(client).toMatch(/instanceof FormData/);
  });

  it("0135: a decision names the revision it was made on; the payer number and a correction are shown; the portal never decides", () => {
    const page = readFileSync("src/pages/admin/Proofs.tsx", "utf8");
    expect(page).toContain('revision: proof.revision ?? 1');
    expect(page).toMatch(/proof.payerPhone/);
    expect(page).toMatch(/admin.proofs.revised/);
    expect(page).toMatch(/proof_revised/);
    const store = readFileSync("src/pages/portal/StorePayment.tsx", "utf8");
    expect(store).not.toMatch(/(approve|refuse)/);
    expect(store).not.toMatch(/set\('amount'/);
  });

});

describe('0138: the two-person review in the console', () => {
  it('names where the money went; the first step opens the access; an opened proof offers only confirm or refuse, with its revision', () => {
    const page = readFileSync('src/pages/admin/Proofs.tsx', 'utf8');
    expect(page).toContain('proof.receiveService && proof.receiveNumber');
    expect(page).toMatch(/proof\.review \? \(/);
    expect(page).toContain("act('confirm', {})");
    // Every decision still names the revision it was made on (the server refuses an older one).
    expect(page).toContain('revision: proof.revision ?? 1');
    for (const k of ['admin.proofs.open', 'admin.proofs.confirmDeposit', 'admin.proofs.opened', 'admin.proofs.overdue', 'admin.proofs.receiver'] as const) {
      expect([en[k], fr[k], ar[k]].every(Boolean)).toBe(true);
    }
    // The Owner's words never mention a provisional step or a second administrator.
    for (const cat of [en, fr, ar]) {
      for (const [k, v] of Object.entries(cat)) {
        if (k.startsWith('pay.') || k.startsWith('portal.')) expect({ k, v: /provisional|second administrator|provisoire|second administrateur|مؤقت|مسؤول آخر/i.test(v) }).toEqual({ k, v: false });
      }
    }
  });
});
