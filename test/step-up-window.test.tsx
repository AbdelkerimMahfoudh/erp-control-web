import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../src/i18n';
import { StepUpIndicator, forgetStepUpWindow, refreshStepUpWindow, useStepUp } from '../src/pages/admin/useStepUp';
import { mount, serve, useActivityHarness } from './activity-fixtures';

/**
 * The step-up window in the console (post-Build-4): the password and a code open five absolute minutes on the server;
 * while they run, a decision goes ahead without asking again and the header counts down; the password is never sent with
 * a decision. And the portal's `/claim/` page: the link leaves the address and goes in a body, spent once.
 */
useActivityHarness();
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

function Decide({ onAnswer }: { onAnswer: (ok: boolean) => void }) {
  const { ask, dialog } = useStepUp();
  return (
    <>
      {dialog}
      <StepUpIndicator />
      <button type="button" onClick={() => void ask().then(onAnswer)}>
        Decide
      </button>
    </>
  );
}

const mountDecide = (answers: boolean[]) =>
  render(
    <I18nProvider>
      <Decide onAnswer={(ok) => answers.push(ok)} />
    </I18nProvider>,
  );

describe('the step-up window, reused', () => {
  it('a window already open on the server: the decision goes ahead without the dialog, and the header counts down', async () => {
    forgetStepUpWindow();
    const end = new Date(Date.now() + 4 * 60_000 + 32_000).toISOString();
    const sent = serve((url) => (url.endsWith('/platform/admin/step-up') ? { body: { expiresAt: end } } : undefined));
    const answers: boolean[] = [];
    mountDecide(answers);
    await act(async () => refreshStepUpWindow());
    expect(await screen.findByText(/^Verified for 4:3\d$/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Decide' }));
    expect(answers).toEqual([true]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sent.filter((r) => r.method === 'POST')).toEqual([]);
  });

  it('no window: the dialog once; then every decision in the next five minutes goes ahead, and no password travels with one', async () => {
    forgetStepUpWindow();
    const sent = serve((url, body) => {
      // The read (no body) finds none open; the step-up (password and code) opens one.
      if (url.endsWith('/platform/admin/step-up')) return { body: { expiresAt: body ? new Date(Date.now() + 5 * 60_000).toISOString() : null } };
      return undefined;
    });
    const answers: boolean[] = [];
    mountDecide(answers);
    act(() => forgetStepUpWindow());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Decide' }));
    await user.type(await screen.findByLabelText('Password'), 'admin-pw');
    await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
    await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: 'Confirm', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Decide' }));
    await user.click(screen.getByRole('button', { name: 'Decide' }));
    expect(answers).toEqual([true, true, true]);
    const posts = sent.filter((r) => r.method === 'POST');
    expect(posts.map((r) => r.url.replace(/^.*\/api\/v1\//, ''))).toEqual(['platform/admin/step-up']);
    expect(await screen.findByText(/^Verified for [45]:\d\d$/)).toBeTruthy();
  });
});

describe('the portal’s /claim/ page', () => {
  const TOKEN = 'Q'.repeat(43);

  it('drops the link from the address and sends it once, in the body; an expired link says what to do', async () => {
    const sent = serve((url) => (url.endsWith('/platform/portal/claim-link') ? { status: 410, body: { code: 'claim_link_expired', message: 'expired' } } : undefined));
    const replaced: string[] = [];
    const original = window.history.replaceState.bind(window.history);
    window.history.replaceState = (data, unused, url) => {
      replaced.push(String(url));
      original(data, unused, url);
    };
    mount(`/claim/${TOKEN}`);
    expect(await screen.findByText(/This link has expired/)).toBeTruthy();
    window.history.replaceState = original;
    expect(replaced).toContain('/claim');
    const claims = sent.filter((r) => r.url.endsWith('/platform/portal/claim-link'));
    expect(claims).toHaveLength(1);
    expect(claims[0]!).toMatchObject({ method: 'POST', body: { token: TOKEN } });
    expect(claims[0]!.url).not.toContain(TOKEN);
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  });

  it('an already-used and an invalid link each say so', async () => {
    for (const [code, text] of [['claim_link_used', /already used/], ['claim_link_invalid', /not valid/]] as const) {
      serve((url) => (url.endsWith('/platform/portal/claim-link') ? { status: code === 'claim_link_used' ? 409 : 400, body: { code } } : undefined));
      const view = mount(`/claim/${TOKEN}`);
      expect(await screen.findByText(text)).toBeTruthy();
      view.unmount();
    }
  });
});
