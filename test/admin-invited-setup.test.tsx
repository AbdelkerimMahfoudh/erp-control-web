import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { SLOW_WAIT, mount, serve, useActivityHarness } from './activity-fixtures';

useActivityHarness();
vi.setConfig({ testTimeout: 30_000 });

/*
 * An invited platform administrator's first visit (0115): the setup code passed on privately and a password of their
 * own, then a sign-in with it and their own authenticator — the console opens nothing before. Every refusal is one
 * sentence that never says whether an address, a code or an account exists.
 */
const NEW = { id: 'a2', email: 'medmahmoud@tsxmr.com', name: 'Mohamed Mahmoud' };
const CODE = 'setup-code-0123456789abcdefghijklmnop';
const TOKEN = 'enrolment-token-0123456789abcdef';
const PASSWORD = 'his-own-long-password';
const SIGNED_OUT = { status: 401, body: { message: 'Not signed in' } };

type Cat = Record<keyof typeof en, string>;
/** A field whose label carries a hint: its name starts with the label. */
const starting = (label: string) => new RegExp(`^${label.replace(/[.*+?^${}()|[]\]/g, "\async function fill(user: ReturnType<typeof userEvent.setup>, cat: typeof en,")}`);

async function fill(user: ReturnType<typeof userEvent.setup>, cat: Cat, values: { email: string; code: string; password: string; again: string }) {
  await user.type(await screen.findByLabelText(cat['admin.email'], undefined, SLOW_WAIT), values.email);
  if (values.code) await user.type(screen.getByLabelText(starting(cat['admin.invited.code'])), values.code);
  if (values.password) await user.type(screen.getByLabelText(starting(cat['admin.invited.password'])), values.password);
  if (values.again) await user.type(screen.getByLabelText(cat['admin.invited.again']), values.again);
  await user.click(screen.getByRole('button', { name: cat['admin.invited.submit'] }));
}

describe('setting up an invited administrator', () => {
  it('spends the code with his own password, signs in, and opens his own authenticator with the token it was given', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return SIGNED_OUT;
      if (url.endsWith('/platform/admin/setup')) return { body: { enrolmentToken: TOKEN, expiresAt: '2026-11-01T10:30:00.000Z' } };
      if (url.endsWith('/platform/admin/sign-in')) return { body: { admin: NEW, expiresAt: '2026-11-01T22:00:00.000Z', mfa: 'enrolment_required' } };
      if (url.endsWith('/platform/admin/mfa/enrolment/start')) return { body: { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' } };
      return undefined;
    });
    mount('/admin/setup');
    const user = userEvent.setup();
    await fill(user, en, { email: NEW.email, code: CODE, password: PASSWORD, again: PASSWORD });

    expect(await screen.findByLabelText(en['admin.mfa.enrol.key'])).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'platform' })).toBeNull();
    const setup = sent.find((r) => r.url.endsWith('/platform/admin/setup'))!;
    expect(setup.body).toEqual({ email: NEW.email, code: CODE, password: PASSWORD });
    expect(sent.find((r) => r.url.endsWith('/platform/admin/sign-in'))!.body).toEqual({ email: NEW.email, password: PASSWORD });
    expect(sent.find((r) => r.url.endsWith('/mfa/enrolment/start'))!.body).toEqual({ enrolmentToken: TOKEN });
    // Nothing of the code, the token or the password stays on the page.
    expect(document.body.innerHTML).not.toContain(CODE);
    expect(document.body.innerHTML).not.toContain(PASSWORD);
    expect((document.body.textContent ?? '').includes(TOKEN)).toBe(false);
  });

  it('checks the form first: each problem beside its field, nothing sent', async () => {
    const sent = serve((url) => (url.endsWith('/platform/admin/me') ? SIGNED_OUT : undefined));
    mount('/admin/setup');
    const user = userEvent.setup();
    await fill(user, en, { email: 'not-an-address', code: 'short', password: 'short', again: 'other' });
    for (const key of ['admin.invited.problem.email', 'admin.invited.problem.code', 'admin.invited.problem.password', 'admin.invited.problem.again'] as const) {
      expect(screen.getByText(en[key])).toBeTruthy();
    }
    expect(sent.some((r) => r.url.endsWith('/platform/admin/setup'))).toBe(false);
  });

  it('one refusal, whatever the server says, never its words; and nothing typed is held after success only', async () => {
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return SIGNED_OUT;
      if (url.endsWith('/platform/admin/setup')) return { status: 400, body: { code: 'admin_setup_refused', message: 'That setup could not be completed. Check the address and the code, or ask for a new code.' } };
      return undefined;
    });
    mount('/admin/setup');
    const user = userEvent.setup();
    await fill(user, en, { email: NEW.email, code: CODE, password: PASSWORD, again: PASSWORD });
    expect(await screen.findByText(en['admin.invited.refused'])).toBeTruthy();
    expect((screen.getByLabelText(en['admin.email']) as HTMLInputElement).value).toBe(NEW.email);
  });

  it('a throttled try says so, in the page’s words', async () => {
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return SIGNED_OUT;
      if (url.endsWith('/platform/admin/setup')) return { status: 429, body: { statusCode: 429, message: 'ThrottlerException: Too Many Requests' } };
      return undefined;
    });
    mount('/admin/setup');
    const user = userEvent.setup();
    await fill(user, en, { email: NEW.email, code: CODE, password: PASSWORD, again: PASSWORD });
    expect(await screen.findByText(en['error.tooManyRequests'])).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Throttler/);
  });
});

describe.each([
  ['fr', fr],
  ['ar', ar],
] as const)('in %s', (lang, cat) => {
  it('the page, its field messages and its refusal are the visitor’s language', async () => {
    localStorage.setItem('erp.web.language', lang);
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return SIGNED_OUT;
      if (url.endsWith('/platform/admin/setup')) return { status: 400, body: { code: 'admin_setup_refused', message: 'That setup could not be completed.' } };
      return undefined;
    });
    mount('/admin/setup');
    const user = userEvent.setup();
    expect(await screen.findByText(cat['admin.invited.title'], undefined, SLOW_WAIT)).toBeTruthy();
    await fill(user, cat, { email: NEW.email, code: CODE, password: 'short', again: 'short' });
    expect(screen.getByText(cat['admin.invited.problem.password'])).toBeTruthy();
    await user.clear(screen.getByLabelText(starting(cat['admin.invited.password'])));
    await user.clear(screen.getByLabelText(cat['admin.invited.again']));
    await user.type(screen.getByLabelText(starting(cat['admin.invited.password'])), PASSWORD);
    await user.type(screen.getByLabelText(cat['admin.invited.again']), PASSWORD);
    await user.click(screen.getByRole('button', { name: cat['admin.invited.submit'] }));
    expect(await screen.findByText(cat['admin.invited.refused'])).toBeTruthy();
    expect(document.body.textContent).not.toContain('That setup could not be completed');
  });
});
