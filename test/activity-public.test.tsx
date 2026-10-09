import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BOTH, PLAN_V3, line, mount, quoteOf, serve, useActivityHarness } from './activity-fixtures';

useActivityHarness();

describe('Apply: the first store’s activity', () => {
  it('offers three cards with the server’s prices, requires a choice, and sends it', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
      if (url.endsWith('/platform/register')) return { status: 201, body: { status: 'pending', created: true, publicStoreId: 'ST-7Q4K', activity: 'money_agent', verification: null, continuation: null, next: 'sign_in' } };
      return undefined;
    });
    mount('/apply');
    const user = userEvent.setup();

    const group = (await screen.findByText('What does your first store do?')).closest('fieldset')!;
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(within(group).getByRole('radio', { name: /Electronics store/ })).toBeTruthy();
    const agent = within(group).getByRole('radio', { name: /Money services agent/ });
    expect(within(group).getByRole('radio', { name: /Both/ })).toBeTruthy();
    // Prices are the plan's, read once it arrives.
    expect(await within(group).findByText('300 MRU')).toBeTruthy();
    expect(within(group).getByText('500 MRU')).toBeTruthy();
    expect(within(group).getByText('700 MRU')).toBeTruthy();
    // The agent is independent — never a bank employee.
    expect(within(group).getByText(/An independent agent exchanging cash/)).toBeTruthy();
    expect(group.textContent).not.toMatch(/bank employee/i);

    await user.type(screen.getByLabelText('Your name'), 'Aminetou');
    await user.type(screen.getByLabelText('Business name'), 'Agence Aminetou');
    await user.type(screen.getByLabelText('First store name'), 'Agence Centre');
    await user.type(screen.getByLabelText(/Email address/), 'owner@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password');

    // Required: nothing is sent without a choice.
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText('Choose what your first store does.')).toBeTruthy();
    expect(sent.filter((r) => r.url.endsWith('/platform/register'))).toHaveLength(0);

    await user.click(agent);
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText('Your application is in')).toBeTruthy();
    const register = sent.find((r) => r.url.endsWith('/platform/register'))!;
    expect(register.body).toMatchObject({ ownerName: 'Aminetou', businessName: 'Agence Aminetou', branchName: 'Agence Centre', activity: 'money_agent', email: 'owner@example.test' });
    // What the server recorded is what the page repeats.
    expect(screen.getByText('First store: Money services agent.')).toBeTruthy();
  });
});

describe('Home: three prices and an estimate by activity', () => {
  it('lists the three prices and sends one activity per store to the quote', async () => {
    const sent = serve((url, body) => {
      if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
      if (url.endsWith('/platform/quote')) {
        expect(body).toEqual({ stores: [2, 0], activities: ['electronics', 'both'] });
        return { body: quoteOf([line(null, 'Store 1', 'electronics', 500, 2, 1, 100), line(null, 'Store 2', 'both', 700, 0)], 1200, 100) };
      }
      return undefined;
    });
    mount('/');
    const user = userEvent.setup();
    const pricing = (await screen.findByText('Pricing')).closest('section')!;
    expect(await within(pricing).findByText('Money services agent')).toBeTruthy();
    expect(within(pricing).getByText('300 MRU')).toBeTruthy();
    expect(within(pricing).getByText('700 MRU')).toBeTruthy();
    expect(within(pricing).getByText('500 MRU')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add a store' }));
    const employees = screen.getAllByLabelText('Employees') as HTMLInputElement[];
    await user.clear(employees[0]!);
    await user.type(employees[0]!, '2');
    const activities = screen.getAllByLabelText('Activity') as HTMLSelectElement[];
    expect(activities[0]!.value).toBe('electronics');
    await user.selectOptions(activities[1]!, 'both');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));

    const estimate = (await screen.findByText('Estimate your monthly total')).closest('section')!;
    // The server's figures, itemised: each store's activity and fee, the stores total, the seats unchanged.
    expect(await within(estimate).findByText(/1,300 MRU|1\s300 MRU/)).toBeTruthy();
    const items = within(estimate).getAllByRole('listitem');
    expect(items[0]!.textContent).toMatch(/Store 1 — Electronics store 500 MRU · 1 included seat, 1 paid seat\(s\) — 100 MRU/);
    expect(items[1]!.textContent).toMatch(new RegExp(`Store 2 — ${BOTH.replace(/[()]/g, '\\$&')} 700 MRU · 1 included seat, 0 paid seat\\(s\\) — 0 MRU`));
    expect(within(estimate).getByText(/Stores:/).textContent).toMatch(/Stores: 1,200 MRU · Additional seats: 100 MRU/);
    expect(sent.filter((r) => r.url.endsWith('/platform/quote'))).toHaveLength(1);
  });

  it('shows only the electronics price when the API predates the activity', async () => {
    serve((url) => (url.endsWith('/platform/plan') ? { body: { ...PLAN_V3, agentMonthly: undefined, bothMonthly: undefined } } : undefined));
    mount('/');
    const pricing = (await screen.findByText('Pricing')).closest('section')!;
    expect(await within(pricing).findByText('Electronics store')).toBeTruthy();
    expect(within(pricing).queryByText('Money services agent')).toBeNull();
  });
});
