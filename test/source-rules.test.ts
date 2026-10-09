import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';

/** Every source file, so a new one cannot escape the rules. */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const SRC = join(process.cwd(), 'src');
const files = walk(SRC);
const code = files.filter((f) => /\.(ts|tsx)$/.test(f));
const read = (f: string) => readFileSync(f, 'utf8');

/*
 * Every price field the API sends, and any local named like one. Widened for
 * the activity prices (docs/73, 2026-10-09): `agentMonthly`, `bothMonthly` and
 * `activityFee` are caught by `\w*Monthly` / `\w*Fee`, as is a local such as
 * `targetFee` — the old list named each field and would have let them through.
 */
const PRICE = String.raw`\w*Monthly|\w*Fee|monthlyAmount|monthlyTotal|assessedTotal|differenceNow|dueNow|monthlyAfter|monthly`;
const PRICE_ARITHMETIC = new RegExp(String.raw`(${PRICE})\s*[*+\-/]\s*\w|\w\s*[*+\-/]\s*(${PRICE})\b`);
/**
 * There used to be one exception — explaining an activity upgrade before it
 * was asked for, as "the new price minus today's". It priced from today's list
 * where the server charges the running period's own prices, and only when a
 * paid month runs (the 2026-10-09 review), so the server now answers that
 * question itself (GET my-subscription/activity-options). No exception remains.
 */
const EXPLANATION_ONLY = 'explanation-only';

describe('the website never computes a price', () => {
  it('no source multiplies or adds a price field', () => {
    for (const f of code) {
      const hits = read(f)
        .split('\n')
        .filter((line: string) => PRICE_ARITHMETIC.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*'));
      expect({ file: relative(SRC, f), hits }).toEqual({ file: relative(SRC, f), hits: [] });
    }
  });

  it('explains no change by its own arithmetic: the server says what a change would do', () => {
    const marked = code.filter((f) => read(f).includes(EXPLANATION_ONLY)).map((f) => relative(SRC, f));
    expect(marked).toEqual([]);
    expect(read(join(SRC, 'pages/account/Account.tsx'))).toMatch(/platform\/my-subscription\/activity-options/);
  });
});

describe('where credentials live', () => {
  it('writes exactly two preference keys to storage, and nothing else', () => {
    for (const f of code) {
      const src = read(f);
      expect({ file: relative(SRC, f), session: /sessionStorage/.test(src) }).toEqual({ file: relative(SRC, f), session: false });
      for (const m of src.matchAll(/localStorage\.setItem\(([^,]+),/g)) {
        expect(['LANGUAGE_STORAGE_KEY', 'THEME_STORAGE_KEY']).toContain(m[1]!.trim());
      }
    }
    expect(read(join(SRC, 'i18n/index.tsx'))).toMatch(/LANGUAGE_STORAGE_KEY = 'erp\.web\.language'/);
    expect(read(join(SRC, 'theme/theme.tsx'))).toMatch(/THEME_STORAGE_KEY = 'erp\.web\.theme'/);
  });

  it('never stores a token or a password', () => {
    for (const f of code) {
      const src = read(f);
      expect({ file: relative(SRC, f), ok: !/setItem\([^)]*(token|password|session)/i.test(src) }).toEqual({ file: relative(SRC, f), ok: true });
    }
  });
});

describe('colours are tokens', () => {
  it('no raw hex or rgba outside tokens.css', () => {
    for (const f of files) {
      if (f.endsWith('tokens.css')) continue;
      const src = read(f);
      const raw = src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [];
      expect({ file: relative(SRC, f), raw }).toEqual({ file: relative(SRC, f), raw: [] });
    }
  });

  it('every light token has a dark counterpart', () => {
    const css = read(join(SRC, 'theme/tokens.css'));
    const light = css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']"));
    const dark = css.slice(css.indexOf(":root[data-theme='dark']"));
    const names = (block: string) => [...block.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]).sort();
    expect(names(dark)).toEqual(names(light));
  });
});

describe('the payment boundary', () => {
  it('no provider is marked available until one is configured and tested', () => {
    const src = read(join(SRC, 'providers/payment.ts'));
    expect(src).toMatch(/available: false/);
    expect(src).not.toMatch(/available: true/);
  });

  /**
   * The money services agent's own trade names the providers it exchanges
   * credit for (D154, docs/73 §6) — one catalogue string per language, checked
   * by the parity test to carry no payment wording. It is cut out before the
   * scan; every other line of every source still may not name a provider.
   */
  const AGENT_TRADE: Record<string, string> = {
    [join('i18n', 'en.ts')]: en['activity.money_agent.body'],
    [join('i18n', 'fr.ts')]: fr['activity.money_agent.body'],
    [join('i18n', 'ar.ts')]: ar['activity.money_agent.body'],
  };

  it('no page names a payment destination number or a provider', () => {
    for (const f of code) {
      let src = read(f);
      const trade = AGENT_TRADE[relative(SRC, f)];
      if (trade) {
        expect({ file: relative(SRC, f), found: src.split(trade).length - 1 }).toEqual({ file: relative(SRC, f), found: 1 });
        src = src.replace(trade, '');
      }
      expect({ file: relative(SRC, f), ok: !/bankily|masrivi|sedad|bimbank/i.test(src) }).toEqual({ file: relative(SRC, f), ok: true });
    }
  });
});
