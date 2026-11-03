import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../src/i18n';

/**
 * A page under `/fr` or `/ar` declares its own language from its first commit, never the outer provider's for a moment
 * (console CI 41622232435: the browser checks read `lang="en"` on `/fr` while the outer provider had not yet followed).
 * Every value the document takes is recorded, so a passing glimpse of the wrong language fails too.
 */
afterEach(cleanup);

async function languagesWritten(ui: React.ReactElement): Promise<string[]> {
  document.documentElement.lang = 'xx';
  // Each record carries the value before its write, so every intermediate value is seen, not only the last.
  const olds: string[] = [];
  const observer = new MutationObserver((records) => records.forEach((r) => olds.push(r.oldValue ?? '')));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'], attributeOldValue: true });
  await act(async () => {
    render(ui);
  });
  await act(async () => new Promise((r) => setTimeout(r, 0)));
  olds.push(...observer.takeRecords().map((r) => r.oldValue ?? ''));
  observer.disconnect();
  // The values written: each write's successor's old value, then what the document says now.
  return [...olds.slice(1), document.documentElement.lang];
}

describe('the document says the address’s language from the start', () => {
  it.each(['fr', 'ar'] as const)('an outer provider on English never overwrites a page fixed to %s', async (lang) => {
    // The outer provider starts from the device's language (English in the browser checks).
    const seen = await languagesWritten(
      <I18nProvider>
        <I18nProvider fixed={lang}>
          <p>page</p>
        </I18nProvider>
      </I18nProvider>,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((l) => l === lang)).toBe(true);
    expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
  });

  it('without a fixed page, the outer provider still writes its own language', async () => {
    const seen = await languagesWritten(
      <I18nProvider>
        <p>console</p>
      </I18nProvider>,
    );
    expect(seen.at(-1)).toMatch(/^(en|fr|ar)$/);
  });
});
