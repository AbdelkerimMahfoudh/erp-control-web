import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { mount, serve, useActivityHarness } from './activity-fixtures';

useActivityHarness();

/**
 * The administrator console's second step (0094): a password opens nothing until a code from the authenticator —
 * or, with none enrolled, the server's one-time token and the authenticator's first code — completes the session;
 * every decision asks for the password and a fresh code, checked by the server before the decision is sent.
 */

const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
const DASHBOARD = { businesses: 0, branches: 0, activeUsers: 0, pendingSeatRequests: 0, pendingStaff: 0, byState: {} };
const PENDING = { status: 401, body: { code: 'mfa_required', message: 'Enter a code from your authenticator to continue.' } };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email address'), 'admin@example.test');
  await user.type(screen.getByLabelText('Password'), 'admin-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('signing in to the console', () => {
  it('a password leads to the code screen; the console opens only once the code is accepted', async () => {
    let verified = false;
    const sent = serve((url, body) => {
      if (url.endsWith('/platform/admin/sign-in')) return { body: { admin: ADMIN, expiresAt: '2026-10-12T22:00:00.000Z', mfa: 'required' } };
      if (url.endsWith('/platform/admin/mfa/verify')) {
        verified = (body as { code?: string }).code === '123456';
        return verified ? { body: { verified: true } } : { status: 403, body: { code: 'mfa_code_invalid', message: 'That code did not match, or was already used. Wait for the next code.' } };
      }
      if (url.endsWith('/platform/admin/me')) return verified ? { body: ADMIN } : PENDING;
      if (url.endsWith('/platform/dashboard')) return { body: DASHBOARD };
      return undefined;
    });
    mount('/admin');
    const user = userEvent.setup();
    await signIn(user);
    expect(await screen.findByText('Second step')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'platform' })).toBeNull();

    await user.type(screen.getByLabelText('Code from your authenticator'), '654321');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/That code did not match/)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'platform' })).toBeNull();

    await user.clear(screen.getByLabelText('Code from your authenticator'));
    await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('navigation', { name: 'platform' })).toBeTruthy();
    expect(sent.filter((r) => r.url.endsWith('/platform/admin/mfa/verify')).map((r) => r.body)).toEqual([{ code: '654321' }, { code: '123456' }]);
  });

  it('a recovery code can stand in for the authenticator', async () => {
    let verified = false;
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/sign-in')) return { body: { admin: ADMIN, expiresAt: 'x', mfa: 'required' } };
      if (url.endsWith('/platform/admin/mfa/verify')) return (verified = true), { body: { verified: true } };
      if (url.endsWith('/platform/admin/me')) return verified ? { body: ADMIN } : PENDING;
      if (url.endsWith('/platform/dashboard')) return { body: DASHBOARD };
      return undefined;
    });
    mount('/admin');
    const user = userEvent.setup();
    await signIn(user);
    await user.click(await screen.findByRole('button', { name: 'Use a recovery code' }));
    await user.type(screen.getByLabelText('Recovery code'), 'ABCDE-FGHIJ');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('navigation', { name: 'platform' })).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/mfa/verify'))!.body).toEqual({ recoveryCode: 'ABCDE-FGHIJ' });
  });

  it('with no authenticator yet: the server’s token, the key, the first code, then the recovery codes — shown once', async () => {
    let enrolled = false;
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/sign-in')) return { body: { admin: ADMIN, expiresAt: 'x', mfa: 'enrolment_required' } };
      if (url.endsWith('/platform/admin/mfa/enrolment/start')) return { body: { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Dukan%20ERP%3Aadmin%40example.test?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' } };
      if (url.endsWith('/platform/admin/mfa/enrolment/confirm')) return (enrolled = true), { body: { recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] } };
      if (url.endsWith('/platform/admin/me')) return enrolled ? { body: ADMIN } : PENDING;
      if (url.endsWith('/platform/dashboard')) return { body: DASHBOARD };
      return undefined;
    });
    mount('/admin');
    const user = userEvent.setup();
    await signIn(user);
    expect(await screen.findByText('Set up your authenticator')).toBeTruthy();
    await user.type(screen.getByLabelText('Enrolment token'), 'the-token-from-the-server-cli');
    await user.click(screen.getByRole('button', { name: 'Show my key' }));
    expect((await screen.findByLabelText('Key for your authenticator')).textContent).toBe('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
    expect(screen.getByRole('link', { name: 'Open in an authenticator app' }).getAttribute('href')).toMatch(/^otpauth:\/\/totp\//);
    await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    const list = await screen.findByRole('list', { name: 'Your recovery codes' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['AAAAA-BBBBB', 'CCCCC-DDDDD']);
    const go = screen.getByRole('button', { name: 'Continue to the console' });
    expect((go as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByLabelText('I have saved these codes'));
    await user.click(go);
    expect(await screen.findByRole('navigation', { name: 'platform' })).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/enrolment/start'))!.body).toEqual({ enrolmentToken: 'the-token-from-the-server-cli' });
    expect(sent.find((r) => r.url.endsWith('/enrolment/confirm'))!.body).toEqual({ code: '123456' });
  });
});

describe('a decision’s step-up', () => {
  it('a wrong password or code keeps the dialog open with the reason, and the decision is never sent', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/admin/step-up')) return { status: 403, body: { code: 'step_up_failed', message: 'That password or code did not match.' } };
      if (url.includes('/platform/plans')) return { body: [] };
      return undefined;
    });
    mount('/admin/plans');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Electronics store, per month (MRU)'), '500');
    await user.type(screen.getByLabelText('Money services agent, per month (MRU)'), '350');
    await user.type(screen.getByLabelText('Both, per month (MRU)'), '750');
    await user.type(screen.getByLabelText('Per additional seat (MRU)'), '100');
    await user.type(screen.getByLabelText('Takes effect on'), '2026-12-01T00:00');
    await user.type(screen.getByLabelText(/^Reason/), 'Agent price review');
    await user.click(screen.getByRole('button', { name: 'Schedule a new price' }));
    const dialog = screen.getByRole('dialog', { hidden: true });
    await user.type(within(dialog).getByLabelText('Password'), 'step-up-password');
    // The code must be six digits before anything is sent.
    expect((within(dialog).getByRole('button', { name: 'Confirm', hidden: true }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(within(dialog).getByLabelText('Code from your authenticator'), '12a3456');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm', hidden: true }));
    expect(await within(dialog).findByText(/That password or code did not match/)).toBeTruthy();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(sent.find((r) => r.url.endsWith('/platform/admin/step-up'))!.body).toEqual({ password: 'step-up-password', code: '123456' });
    expect(sent.some((r) => r.method === 'POST' && r.url.endsWith('/platform/plans'))).toBe(false);
  });
});
