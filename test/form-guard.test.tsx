import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installFormGuard } from '../src/lib/form-guard';
import { PasswordInput } from '../src/components/PasswordInput';
import { I18nProvider } from '../src/i18n';

installFormGuard();

describe('a form pressed with a field to correct (owner, 2026-11-16)', () => {
  it('stops a noValidate form, outlines it, and moves to the first field in order', async () => {
    const sent = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form noValidate onSubmit={sent}>
        <input aria-label="a" defaultValue="x" required />
        <input aria-label="b" required />
        <input aria-label="c" type="email" defaultValue="nope" />
        <button type="submit">Go</button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(sent).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('b'));
    expect(screen.getByLabelText('b').closest('form')!.classList.contains('tried')).toBe(true);
  });

  it('the password eye shows and hides what was typed', async () => {
    render(
      <I18nProvider>
        <label>
          Password
          <PasswordInput defaultValue="secret" />
        </label>
      </I18nProvider>,
    );
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input.type).toBe('password');
  });
});
