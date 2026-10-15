import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { PLAN_V3, mount, serve, useActivityHarness, type Handler } from './activity-fixtures';

useActivityHarness();

/*
 * The application's refusals (2026-10-15): every contact given at registration must be verified, so the server refuses
 * before saving anything when any of them cannot receive its code now, and names those (C10). The server accepts
 * idempotency keys of /^[A-Za-z0-9._:-]{1,80}$/ only (C11): the page's are UUIDs.
 */
const SERVER_KEY = /^[A-Za-z0-9._:-]{1,80}$/;

const verifying = {
  status: 201,
  body: {
    status: 'pending',
    created: true,
    publicStoreId: 'ST-7Q4K',
    activity: 'electronics',
    verification: { destination: 'o•••@example.test', channel: 'email' },
    continuation: { token: 'continuation-for-tests', expiresAt: '2026-10-15T10:00:00.000Z', expiresInSeconds: 900 },
    next: 'verify_contact',
  },
};
const unavailable = (named?: string[]) => ({
  status: 503,
  body: { statusCode: 503, code: 'registration_unavailable', message: 'Registration is not available right now.', ...(named ? { unavailableContacts: named } : {}) },
});

function apply(register: Handler) {
  const sent = serve((url, body) => {
    if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
    if (url.endsWith('/platform/register')) return register(url, body);
    return undefined;
  });
  mount('/apply');
  const registrations = () => sent.filter((r) => r.url.endsWith('/platform/register')).map((r) => r.body as Record<string, string>);
  return registrations;
}

async function fill(contacts: { email?: string; phone?: string }) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Your name'), 'Aminetou');
  await user.type(screen.getByLabelText('Business name'), 'Boutique Test');
  await user.type(screen.getByLabelText('First store name'), 'Centre');
  if (contacts.email) await user.type(screen.getByLabelText(/Email address/), contacts.email);
  if (contacts.phone) await user.type(screen.getByLabelText(/WhatsApp number/), contacts.phone);
  await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
  await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
  return user;
}

describe('Apply: a contact whose code cannot be sent now (C10)', () => {
  it('only the WhatsApp number, beside an email address: remove the number or try later — and without it, a new attempt goes through', async () => {
    const registrations = apply((_url, body) => ((body as { phone?: string }).phone ? unavailable(['phone']) : verifying));
    const user = await fill({ email: 'owner@example.test', phone: '+22212345678' });
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['apply.unavailable.whatsapp'])).toBeTruthy();
    expect(screen.queryByText(en['apply.unavailable.title'])).toBeNull();
    // Nothing moved on: the form is still there, to change.
    await user.clear(screen.getByLabelText(/WhatsApp number/));
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByLabelText('Verification code')).toBeTruthy();
    const [first, second] = registrations();
    expect(first).toMatchObject({ email: 'owner@example.test', phone: '+22212345678' });
    expect(second).not.toHaveProperty('phone');
    for (const body of [first, second]) expect(body!.idempotencyKey).toMatch(SERVER_KEY);
  });

  it('every other case keeps the general refusal: a WhatsApp number alone, the email, both, or none named', async () => {
    for (const [contacts, named] of [
      [{ phone: '+22212345678' }, ['phone']],
      [{ email: 'owner@example.test' }, ['email']],
      [{ email: 'owner@example.test', phone: '+22212345678' }, ['email', 'phone']],
      [{ email: 'owner@example.test', phone: '+22212345678' }, undefined],
    ] as const) {
      apply(() => unavailable(named ? [...named] : undefined));
      const user = await fill(contacts);
      await user.click(screen.getByRole('button', { name: 'Send my application' }));
      expect(await screen.findByText(en['apply.unavailable.title'])).toBeTruthy();
      expect(screen.getByText(en['apply.unavailable.body'])).toBeTruthy();
      expect(screen.queryByText(en['apply.unavailable.whatsapp'])).toBeNull();
      cleanup();
    }
  });
});
