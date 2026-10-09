import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { B1, B2, BOTH, BRANCHES, LINES, allocation, mount, serve, subscription, useActivityHarness } from './activity-fixtures';

useActivityHarness();

describe('the platform console', () => {
  const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
  const BUSINESS = { id: '0192f000-0000-7000-8000-0000000000b1', name: 'Boutique Test', publicStoreId: 'ST-7Q4K' };

  beforeEach(() => {
    // jsdom has no <dialog> behaviour; the step-up dialog only needs open/close.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('shows an activity request in the queue — from → to, when, the store and the amount — with the payment actions', async () => {
    const upgrade = { ...allocation({}), business: BUSINESS };
    const scheduled = { ...allocation({ id: '0192f000-0000-7000-8000-0000000000a2', branchId: B2, branchName: 'Boutique Ksar', activityFrom: 'both', activityTo: 'money_agent', status: 'granted', activityEffective: 'renewal', monthlyAmount: 0 }), business: BUSINESS };
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/seat-requests?status=pending_payment')) return { body: [upgrade] };
      if (url.endsWith('/platform/seat-requests?status=granted')) return { body: [scheduled] };
      if (url.endsWith(`/seat-requests/${upgrade.id}/confirm-payment`)) return { body: { applied: true, allocation: { ...upgrade, status: 'paid' }, paymentId: 'pay1', activation: null } };
      return undefined;
    });
    mount('/admin/seat-requests');
    const user = userEvent.setup();
    const row = (await screen.findByText(/Activity change at Agence Centre/)).closest('tr')!;
    expect(within(row).getByText('Money services agent → ' + BOTH)).toBeTruthy();
    expect(within(row).getByText(/once the difference is paid/)).toBeTruthy();
    expect(within(row).getByText('400 MRU for this month (the difference)')).toBeTruthy();
    expect(within(row).getByText('Awaiting payment')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Boutique Test' })).toBeTruthy();
    expect(within(row).getByRole('button', { name: 'Refuse' })).toBeTruthy();

    await user.click(within(row).getByRole('button', { name: 'Confirm payment' }));
    expect((within(row).getByLabelText('Amount (MRU)') as HTMLInputElement).value).toBe('400');
    await user.type(within(row).getByLabelText(/Reference/), 'BK-2026-1009');
    await user.click(within(row).getByRole('button', { name: 'Confirm' }));
    await user.type(await screen.findByLabelText('Password'), 'step-up-password');
    await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: 'Confirm', hidden: true }));
    expect(await screen.findByText('The store’s activity was changed.')).toBeTruthy();
    const confirm = sent.find((r) => r.url.endsWith('/confirm-payment'))!;
    expect(confirm.body).toMatchObject({ amount: '400', reference: 'BK-2026-1009', expectedVersion: 1, confirmPassword: 'step-up-password' });

    // A downgrade waiting for the renewal: listed under granted, and only cancellable.
    await user.selectOptions(screen.getByDisplayValue('Awaiting payment'), 'granted');
    const later = (await screen.findByText(/Activity change at Boutique Ksar/)).closest('tr')!;
    expect(within(later).getByText('Scheduled for the renewal')).toBeTruthy();
    expect(within(later).getByText('Nothing due now')).toBeTruthy();
    expect(within(later).getByRole('button', { name: 'Cancel the scheduled change' })).toBeTruthy();
    expect(within(later).queryByRole('button', { name: 'Confirm payment' })).toBeNull();
  });

  it('lists and schedules the three activity prices', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/plans'))
        return {
          body: [
            { id: 'p2', version: 2, branchMonthly: 500, agentMonthly: 300, bothMonthly: 700, includedStaffPerBranch: 1, extraStaffMonthly: 100, effectiveFrom: '2026-10-05T00:00:00.000Z', reason: 'seats', state: 'in_force' },
          ],
        };
      return undefined;
    });
    mount('/admin/plans');
    const user = userEvent.setup();
    expect(await screen.findByText('Money services agent')).toBeTruthy();
    expect(screen.getByText('300 MRU')).toBeTruthy();
    expect(screen.getByText('700 MRU')).toBeTruthy();

    await user.type(screen.getByLabelText('Electronics store, per month (MRU)'), '500');
    await user.type(screen.getByLabelText('Money services agent, per month (MRU)'), '350');
    await user.type(screen.getByLabelText('Both, per month (MRU)'), '750');
    await user.type(screen.getByLabelText('Per additional seat (MRU)'), '100');
    await user.type(screen.getByLabelText('Takes effect on'), '2026-12-01T00:00');
    await user.type(screen.getByLabelText(/^Reason/), 'Agent price review');
    await user.click(screen.getByRole('button', { name: 'Schedule a new price' }));
    await user.type(await screen.findByLabelText('Password'), 'step-up-password');
    await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: 'Confirm', hidden: true }));
    await act(async () => undefined);
    const post = sent.find((r) => r.method === 'POST' && r.url.endsWith('/platform/plans'))!;
    expect(post.body).toMatchObject({ branchMonthly: 500, agentMonthly: 350, bothMonthly: 750, includedStaffPerBranch: 1, extraStaffMonthly: 100, reason: 'Agent price review' });
  });

  it('shows each branch’s activity, its scheduled change and its fee on the business page', async () => {
    const detail = {
      ...BUSINESS,
      city: 'Nouakchott',
      createdAt: '2026-09-01T00:00:00.000Z',
      branches: [
        { id: B1, name: 'Agence Centre', type: 'store', activity: 'money_agent', activityNext: null },
        { id: B2, name: 'Boutique Ksar', type: 'store', activity: 'both', activityNext: 'money_agent' },
      ],
      people: [],
      entitlement: { ...subscription(BRANCHES, LINES).entitlement, seatsByStore: [
        { branchId: B1, name: 'Agence Centre', seatsUsed: 0, paidSeats: 0, grantedSeats: 0, includedSeats: 1, seatLimit: 1, seatsAvailable: 1, overLimit: false, activity: 'money_agent', activityNext: null },
        { branchId: B2, name: 'Boutique Ksar', seatsUsed: 0, paidSeats: 0, grantedSeats: 0, includedSeats: 1, seatLimit: 1, seatsAvailable: 1, overLimit: false, activity: 'both', activityNext: 'money_agent' },
      ] },
      pricing: subscription(BRANCHES, LINES).pricing,
      version: 4,
      events: [],
      payments: [],
    };
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith(`/platform/businesses/${BUSINESS.id}`)) return { body: detail };
      if (url.endsWith(`/platform/businesses/${BUSINESS.id}/seat-requests`)) return { body: [] };
      return undefined;
    });
    mount(`/admin/businesses/${BUSINESS.id}`);
    const ksar = (await screen.findByText('Boutique Ksar')).closest('tr')!;
    expect(within(ksar).getByText(BOTH)).toBeTruthy();
    expect(within(ksar).getByText('Changes to Money services agent at the next renewal')).toBeTruthy();
    expect(within(ksar).getByText('700 MRU')).toBeTruthy();
  });
});
