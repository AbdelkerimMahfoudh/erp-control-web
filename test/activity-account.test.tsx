import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Activity, SeatRequest, SubscriptionBranch } from '../src/api/types';
import { B1, B2, BOTH, BRANCHES, LINES, allocation, mount, serve, subscription, useActivityHarness } from './activity-fixtures';

useActivityHarness();

describe('Account: a store’s activity and its change', () => {
  function account(answer: (body: { branchId: string; activity: Activity }) => { status?: number; body: unknown }, branches = BRANCHES, rowsAfter: SeatRequest[] = []) {
    let posted = false;
    const sent = serve((url, body) => {
      if (url.endsWith('/platform/my-subscription')) return { body: subscription(branches, LINES) };
      if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: posted ? rowsAfter : [] };
      if (url.endsWith('/platform/my-subscription/activity-requests')) {
        posted = true;
        return answer(body as { branchId: string; activity: Activity });
      }
      return undefined;
    });
    mount('/account');
    return sent;
  }

  async function openChange(store: string) {
    const stores = (await screen.findByRole('heading', { name: 'Stores' })).closest('section')!;
    const item = within(stores).getByText(store).closest('li')!;
    await userEvent.setup().click(within(item).getByRole('button', { name: 'Change this store’s activity' }));
    return item;
  }

  it('lists each store with its activity; a warehouse offers no change', async () => {
    account(() => ({ body: {} }));
    const stores = (await screen.findByRole('heading', { name: 'Stores' })).closest('section')!;
    expect(within(stores).getByText('Money services agent')).toBeTruthy();
    expect(within(stores).getByText(BOTH)).toBeTruthy();
    expect(within(stores).getByText('Warehouse')).toBeTruthy();
    expect(within(stores).getAllByRole('button', { name: 'Change this store’s activity' })).toHaveLength(2);
    // The quote itemises each store's activity fee.
    const quote = (await screen.findByRole('heading', { name: 'Your monthly total' })).closest('section')!;
    expect(within(quote).getByText('Store fee')).toBeTruthy();
    expect(within(quote).getByText('300 MRU')).toBeTruthy();
  });

  it('an upgrade explains the difference from the plan, then shows the amount the server recorded', async () => {
    const pending = allocation({});
    const sent = account(() => ({ status: 201, body: { allocation: pending, created: true } }), BRANCHES, [pending]);
    const item = await openChange('Agence Centre');
    const user = userEvent.setup();
    expect(within(item).getByText('Now: Money services agent, 300 MRU per month.')).toBeTruthy();
    await user.click(within(item).getByRole('radio', { name: /Both/ }));
    expect(within(item).getByText('400 MRU now for this month, then 700 MRU per month from the next renewal.')).toBeTruthy();
    expect(within(item).getByText(/The amount due is the one the server records/)).toBeTruthy();

    await user.click(within(item).getByRole('button', { name: 'Send the request' }));
    expect(await within(item).findByText(/^400 MRU due now for this month \(the difference\), then 700 MRU per month\./)).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/activity-requests'))!.body).toEqual({ branchId: B1, activity: 'both' });

    // The established pending-payment state: the row in the requests list, with its status and Withdraw.
    const requests = (await screen.findByRole('heading', { name: 'Seat, store and activity requests' })).closest('section')!;
    expect(await within(requests).findByText(/Activity change at Agence Centre/)).toBeTruthy();
    expect(within(requests).getByText('Money services agent → ' + BOTH)).toBeTruthy();
    expect(within(requests).getByText('400 MRU for this month (the difference)')).toBeTruthy();
    expect(within(requests).getByText('Awaiting payment')).toBeTruthy();
    expect(within(requests).getByRole('button', { name: 'Withdraw' })).toBeTruthy();
  });

  it('a downgrade waits for the renewal and asks nothing now', async () => {
    const scheduled = allocation({ branchId: B2, branchName: 'Boutique Ksar', store: { id: B2, name: 'Boutique Ksar' }, activityFrom: 'both', activityTo: 'money_agent', status: 'granted', activityEffective: 'renewal', monthlyAmount: 0 });
    const sent = account(() => ({ status: 201, body: { allocation: scheduled, created: true } }), BRANCHES, [scheduled]);
    const item = await openChange('Boutique Ksar');
    const user = userEvent.setup();
    await user.click(within(item).getByRole('radio', { name: /Money services agent/ }));
    expect(within(item).getByText('300 MRU per month from the next renewal; nothing is due now.')).toBeTruthy();
    await user.click(within(item).getByRole('button', { name: 'Send the request' }));
    expect(await within(item).findByText('Boutique Ksar changes to Money services agent at the next renewal; nothing is due now.')).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/activity-requests'))!.body).toEqual({ branchId: B2, activity: 'money_agent' });
    const requests = (await screen.findByRole('heading', { name: 'Seat, store and activity requests' })).closest('section')!;
    expect(await within(requests).findByText('Scheduled for the renewal')).toBeTruthy();
    expect(within(requests).getByText('Nothing due now')).toBeTruthy();
    // A scheduled change can still be taken back.
    expect(within(requests).getByRole('button', { name: 'Withdraw' })).toBeTruthy();
  });

  it('an upgrade with no paid month running is rendered as the server scheduled it — never "due now"', async () => {
    const scheduledUpgrade = allocation({ status: 'granted', activityEffective: 'renewal', monthlyAmount: 0 });
    account(() => ({ status: 201, body: { allocation: scheduledUpgrade, created: true } }));
    const item = await openChange('Agence Centre');
    const user = userEvent.setup();
    await user.click(within(item).getByRole('radio', { name: /Both/ }));
    await user.click(within(item).getByRole('button', { name: 'Send the request' }));
    expect(await within(item).findByText(`Agence Centre changes to ${BOTH} at the next renewal; nothing is due now.`)).toBeTruthy();
    expect(within(item).queryByText(/due now for this month/)).toBeNull();
  });

  it('keeping today’s activity withdraws the scheduled change', async () => {
    const withScheduled = BRANCHES.map((b): SubscriptionBranch => (b.id === B2 ? { ...b, activityNext: 'money_agent' } : b));
    const released = allocation({ branchId: B2, branchName: 'Boutique Ksar', activityFrom: 'both', activityTo: 'money_agent', status: 'released', activityEffective: 'renewal', monthlyAmount: 0, closedAt: '2026-10-09T10:00:00.000Z' });
    const sent = account(() => ({ status: 201, body: { allocation: released, created: false } }), withScheduled);
    const stores = (await screen.findByRole('heading', { name: 'Stores' })).closest('section')!;
    expect(within(stores).getByText('Changes to Money services agent at the next renewal')).toBeTruthy();
    const item = await openChange('Boutique Ksar');
    const user = userEvent.setup();
    await user.click(within(item).getByRole('radio', { name: /Keep Both/ }));
    expect(within(item).getByText(/The change to Money services agent scheduled for the renewal is withdrawn/)).toBeTruthy();
    await user.click(within(item).getByRole('button', { name: 'Send the request' }));
    expect(await within(item).findByText(`The scheduled change was withdrawn: Boutique Ksar stays ${BOTH}.`)).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/activity-requests'))!.body).toEqual({ branchId: B2, activity: 'both' });
  });

  it('says a refusal in words', async () => {
    account(() => ({ status: 409, body: { statusCode: 409, error: 'Conflict', code: 'activity_request_pending', message: 'Agence Centre already has a request to become electronics. Withdraw it first.' } }));
    const item = await openChange('Agence Centre');
    const user = userEvent.setup();
    await user.click(within(item).getByRole('radio', { name: /Both/ }));
    await user.click(within(item).getByRole('button', { name: 'Send the request' }));
    expect(await within(item).findByText('This store already has another activity request open. Withdraw it first from the requests below.')).toBeTruthy();
  });

  it('asks the new store’s activity and sends it', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/my-subscription')) return { body: subscription(BRANCHES, LINES) };
      if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
      if (url.endsWith('/platform/my-subscription/store-requests'))
        return { status: 201, body: { allocation: allocation({ kind: 'store', label: 'Agence Port', activityTo: 'money_agent', activityFrom: null, activityEffective: null, monthlyAmount: 300 }), created: true } };
      return undefined;
    });
    mount('/account');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Name of the new store'), 'Agence Port');
    const select = screen.getByLabelText('What will it do?') as HTMLSelectElement;
    // The option prices are the plan's.
    expect([...select.options].map((o) => o.textContent)).toEqual(['Electronics store — 500 MRU per month', 'Money services agent — 300 MRU per month', `${BOTH} — 700 MRU per month`]);
    await user.selectOptions(select, 'money_agent');
    await user.click(within(select.closest('form')!).getByRole('button', { name: 'Send the request' }));
    await act(async () => undefined);
    expect(sent.filter((r) => r.url.endsWith('/store-requests')).map((r) => r.body)).toEqual([{ name: 'Agence Port', activity: 'money_agent' }]);
  });

  it('offers no change and shows no figure when the API predates the activity', async () => {
    const old = BRANCHES.map(({ name, type }) => ({ name, type }));
    serve((url) => {
      if (url.endsWith('/platform/my-subscription')) {
        const s = subscription(old, LINES);
        s.pricing.quote.lines = s.pricing.quote.lines.map(({ activity: _a, activityFee: _f, ...rest }) => rest) as typeof s.pricing.quote.lines;
        return { body: s };
      }
      if (url.endsWith('/platform/my-subscription/seat-requests')) return { body: [] };
      return undefined;
    });
    mount('/account');
    const stores = (await screen.findByRole('heading', { name: 'Stores' })).closest('section')!;
    expect(within(stores).getByText('Agence Centre')).toBeTruthy();
    expect(within(stores).queryByRole('button', { name: 'Change this store’s activity' })).toBeNull();
    const quote = (await screen.findByRole('heading', { name: 'Your monthly total' })).closest('section')!;
    expect(within(quote).queryByText('300 MRU')).toBeNull();
  });
});
