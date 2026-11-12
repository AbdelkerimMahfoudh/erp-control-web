import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

/*
 * 2026-11-12 (live check): the portal's messages card printed "notice.kind.branch_activation" — every kind the server
 * keeps (prisma enum SubscriptionNoticeKind) has its words in the three catalogues; and a proof-approved payment's
 * internal reference ("proof:<id>") is never shown to the Owner.
 */
const KINDS = ['portal_instructions', 'trial_reminder', 'trial_expired', 'paid_reminder', 'paid_expired', 'grace_reminder', 'grace_ended', 'branch_activation', 'trial_started'];

describe('subscription message kinds', () => {
  it('names every kind in EN, FR and AR', () => {
    for (const cat of [en, fr, ar] as Record<string, string>[]) for (const k of KINDS) expect({ k, has: !!cat[`notice.kind.${k}`] }).toEqual({ k, has: true });
    expect(readFileSync('src/api/types.ts', 'utf8')).toMatch(/'branch_activation' \| 'trial_started'/);
  });
  it('hides the internal proof reference in the Owner’s requests', () => {
    expect(readFileSync('src/pages/portal/Subscription.tsx', 'utf8')).toContain("!r.payment.reference.startsWith('proof:')");
  });
});
