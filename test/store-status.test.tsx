import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { StoreStatus } from '../src/api/types';
import { ProofLines, StoreStatusList } from '../src/components/stores';
import { I18nProvider } from '../src/i18n';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

/** 0132 (docs/122): each store's own status on the console and the portal, and a proof's lines at approval. */
const store = (over: Partial<StoreStatus>): StoreStatus => ({
  branchId: '01900000-0000-7000-8000-000000000001',
  name: 'Main',
  nameAr: null,
  state: 'active',
  canWrite: true,
  trialEndsAt: null,
  paidUntil: '2026-12-06T10:00:00.000Z',
  complimentaryUntil: null,
  graceEndsAt: null,
  ...over,
});

afterEach(cleanup);

describe('each store’s own subscription', () => {
  it('names every state in all three languages', () => {
    for (const state of ['suspended', 'locked', 'complimentary', 'trial_active', 'active', 'grace', 'trial_expired', 'expired']) {
      for (const c of [en, fr, ar]) expect(c[`portal.stores.state.${state}` as keyof typeof en]).toBeTruthy();
    }
    for (const c of [en, fr, ar]) {
      expect(c['portal.stores.until']).toContain('{date}');
      expect(c['portal.stores.graceUntil']).toContain('{date}');
    }
  });

  it('lists each store with its state in words and its own end; the Arabic name in Arabic', () => {
    render(
      <I18nProvider fixed="en">
        <StoreStatusList
          stores={[
            store({}),
            store({ branchId: '01900000-0000-7000-8000-000000000002', name: 'Ksar', state: 'trial_active', paidUntil: null, trialEndsAt: '2026-11-13T10:00:00.000Z' }),
            store({ branchId: '01900000-0000-7000-8000-000000000003', name: 'Port', state: 'expired', canWrite: false }),
          ]}
        />
      </I18nProvider>,
    );
    const rows = within(screen.getByTestId('store-status')).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Active'), expect.stringContaining('Free trial'), expect.stringContaining('Ended')]);
    expect(rows[1].textContent).toContain('until');
    cleanup();
    render(
      <I18nProvider fixed="ar">
        <StoreStatusList stores={[store({ nameAr: 'الرئيسي' })]} />
      </I18nProvider>,
    );
    expect(screen.getByText('الرئيسي')).toBeTruthy();
  });

  it('a proof shows the stores it pays for, a waiting store marked', () => {
    render(
      <I18nProvider fixed="en">
        <ProofLines lines={[{ branchId: 'a', name: 'Main', amount: 600 }, { branchId: 'b', name: 'Ksar', amount: 600, pending: true }]} />
      </I18nProvider>,
    );
    const rows = within(screen.getByTestId('proof-lines')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('Pending activation');
  });
});
