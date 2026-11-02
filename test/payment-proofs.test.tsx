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

  it('the portal only sends; nothing here may decide access', () => {
    const portal = readFileSync('src/pages/portal/PaymentProofs.tsx', 'utf8');
    expect(portal).toContain('platform/my-subscription/payment-proofs');
    expect(portal).not.toMatch(/approve|payment-proofs\/.*refuse/);
  });

  it('a file goes as a form with its own boundary, never as JSON', () => {
    const client = readFileSync('src/api/client.ts', 'utf8');
    expect(client).toMatch(/instanceof FormData/);
  });
});
