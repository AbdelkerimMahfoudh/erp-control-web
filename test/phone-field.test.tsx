import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PhoneField } from '../src/components/PhoneField';
import { Field } from '../src/components/ui';
import { I18nProvider } from '../src/i18n';
import { en } from '../src/i18n/en';
import { composePhone, splitPhone } from '../src/lib/phone-input';

/**
 * The shared international phone input in the console (D227): the same rules as the mobile app's, one international
 * string to the server, and error text that can be read in both themes.
 */
afterEach(cleanup);

function Harness({ start = '' }: { start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <I18nProvider>
      <Field label="Owner phone">
        <PhoneField required value={value} onChange={setValue} />
      </Field>
      <output data-testid="sent">{value}</output>
      <button type="button" onClick={() => setValue('')}>
        Clear
      </button>
    </I18nProvider>
  );
}

describe('composing and splitting', () => {
  it('a national number takes the chosen country; a whole number keeps its own', () => {
    expect(composePhone('MR', '36 00 11 22')).toBe('+22236001122');
    expect(composePhone('SN', '077 123 45 67')).toBe('+221771234567');
    expect(composePhone('MR', '0033612345678')).toBe('+33612345678');
    expect(composePhone('MR', '+22236001122')).toBe('+22236001122');
    expect(composePhone('MR', '٣٦٠٠١١٢٢')).toBe('+22236001122');
    expect(composePhone('MR', '')).toBe('');
  });

  it('a stored number goes back into its country, longest code first', () => {
    expect(splitPhone('+22236001122')).toEqual({ iso: 'MR', national: '36001122' });
    expect(splitPhone('+97150123456')).toEqual({ iso: 'AE', national: '50123456' });
  });

  it('the console uses the same country list as the mobile app', () => {
    // Line endings aside: a Windows checkout writes CRLF.
    const list = (s: string) => s.replace(/\r\n/g, '\n').slice(s.replace(/\r\n/g, '\n').indexOf('PHONE_COUNTRIES'), s.replace(/\r\n/g, '\n').indexOf('];'));
    const mobile = '../erp-mobile/lib/phone-input.ts';
    let mobileSource: string | null = null;
    try {
      mobileSource = readFileSync(mobile, 'utf8');
    } catch {
      // CI checks the console out alone; the comparison runs where both repositories sit side by side.
    }
    if (mobileSource) expect(list(readFileSync('src/lib/phone-input.ts', 'utf8'))).toBe(list(mobileSource));
  });
});

describe('the field', () => {
  it('the label names the number, the country list has its own name, and one international string is handed on', () => {
    render(<Harness />);
    const number = screen.getByLabelText('Owner phone');
    expect(number.tagName).toBe('INPUT');
    const country = screen.getByLabelText(en['phone.country']);
    expect((country as HTMLSelectElement).value).toBe('MR');
    fireEvent.change(number, { target: { value: '36 00 11 22' } });
    expect(screen.getByTestId('sent').textContent).toBe('+22236001122');
    fireEvent.change(country, { target: { value: 'SN' } });
    expect(screen.getByTestId('sent').textContent).toBe('+22136001122');
  });

  it('a number typed whole with + needs no country, so the list steps aside', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Owner phone'), { target: { value: '+33612345678' } });
    expect(screen.getByTestId('sent').textContent).toBe('+33612345678');
    expect((screen.getByLabelText(en['phone.country']) as HTMLSelectElement).disabled).toBe(true);
  });

  it('a stored number opens split, and a form that clears its value clears the field', () => {
    render(<Harness start="+22136001122" />);
    expect((screen.getByLabelText('Owner phone') as HTMLInputElement).value).toBe('36001122');
    expect((screen.getByLabelText(en['phone.country']) as HTMLSelectElement).value).toBe('SN');
    fireEvent.click(screen.getByText('Clear'));
    expect((screen.getByLabelText('Owner phone') as HTMLInputElement).value).toBe('');
  });

  it('imports nothing from the admin-only console, so the customer portal can carry it', () => {
    for (const path of ['src/components/PhoneField.tsx', 'src/lib/phone-input.ts']) {
      expect(readFileSync(path, 'utf8')).not.toMatch(/pages\/admin|\.admin['"]|auth\/admin/);
    }
  });
});

describe('error text is readable in both themes', () => {
  it('a field’s error is in the danger tone’s text colour, never its wash', () => {
    const css = readFileSync('src/theme/global.css', 'utf8');
    const rule = css.slice(css.indexOf('.field-wrap > span.field-error'), css.indexOf('}', css.indexOf('.field-wrap > span.field-error')));
    expect(rule).toMatch(/color: var\(--danger-fg\)/);
    expect(css).not.toMatch(/--danger-text/);
    expect(css).not.toMatch(/^\s*color: var\(--danger-bg\)/m);
  });
});
