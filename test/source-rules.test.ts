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

/*
 * The free trial's dates (2026-10-13) are the server's: UTC instants recorded at the claim, shown in the business's
 * configured zone, which the server names. No source adds the seven days, does arithmetic on a trial instant, or names
 * a zone of its own — not GMT, not the zone Mauritanian businesses use today — and no trial page formats a date in
 * this browser's zone. The one comparison with this browser's clock (the resend's countdown) takes a plain instant.
 */
const TRIAL_INSTANT = String.raw`claimedAt|startedAt|endsAt|wouldStartAt|wouldEndAt|lastAttemptAt|resendAvailableAt|expiryRecordedAt`;
const TRIAL_ARITHMETIC = new RegExp(
  String.raw`\b(${TRIAL_INSTANT})\b\s*[*+\-/]|[*+\-/]\s*[\w.?!]*\b(${TRIAL_INSTANT})\b|\b(${TRIAL_INSTANT})\b[^;]*\.(getTime|valueOf)\(|Date\.parse\([^)]*\b(${TRIAL_INSTANT})\b`,
);
const TRIAL_DURATION = /\b(168|604800|604_800|86400|86_400)\b|\b7\s*\*\s*24\b|\b24\s*\*\s*7\b/;
const ZONE_LITERAL = /timeZone\s*:\s*['"`]|['"`](UTC|GMT|Etc\/[\w+-]+|(Africa|America|Asia|Atlantic|Europe)\/\w+)['"`]/;
const trialFiles = code.filter((f) => /trial/i.test(relative(SRC, f)));
const executable = (src: string) => src.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));

describe('the free trial’s dates are the server’s', () => {
  it('finds the trial’s sources (the rules below would pass on nothing)', () => {
    expect(trialFiles.map((f) => relative(SRC, f)).sort()).toEqual(
      [join('components', 'trial.tsx'), join('lib', 'trial.ts'), join('pages', 'account', 'TrialCard.tsx'), join('pages', 'account', 'TrialLanding.tsx')].sort(),
    );
  });

  it('no source does arithmetic on a trial instant', () => {
    for (const f of code) {
      const hits = executable(read(f)).filter((line) => TRIAL_ARITHMETIC.test(line));
      expect({ file: relative(SRC, f), hits }).toEqual({ file: relative(SRC, f), hits: [] });
    }
  });

  it('no trial source computes the seven days, and none formats a date in this browser’s zone', () => {
    for (const f of trialFiles) {
      const lines = executable(read(f));
      expect({ file: relative(SRC, f), duration: lines.filter((l) => TRIAL_DURATION.test(l)) }).toEqual({ file: relative(SRC, f), duration: [] });
      expect({ file: relative(SRC, f), browserZone: lines.filter((l) => /formatDate(Time)?\(|toLocale\w*String|getTimezoneOffset|resolvedOptions/.test(l)) }).toEqual({
        file: relative(SRC, f),
        browserZone: [],
      });
    }
  });

  it('no source names a time zone of its own', () => {
    for (const f of code) {
      const hits = executable(read(f)).filter((line) => ZONE_LITERAL.test(line));
      expect({ file: relative(SRC, f), hits }).toEqual({ file: relative(SRC, f), hits: [] });
    }
    // The one formatter of a trial instant takes the zone it is given and nothing else.
    expect(read(join(SRC, 'lib/format.ts'))).toMatch(/export function formatInstant\(iso: string \| null \| undefined, timeZone: string \| null \| undefined, lang: Language\)/);
  });
});

describe('the setup link’s token lives in memory only, and only the server decides', () => {
  it('no source keeps anything in a cookie, IndexedDB or the cache, and no trial source logs or puts the token in an address', () => {
    for (const f of code) expect({ file: relative(SRC, f), stored: /document\.cookie|indexedDB|\bcaches\./.test(read(f)) }).toEqual({ file: relative(SRC, f), stored: false });
    for (const f of trialFiles) {
      const src = read(f);
      expect({ file: relative(SRC, f), logged: /console\./.test(src), inAddress: /\$\{token\}|[?#&]t=\$\{/.test(src) }).toEqual({ file: relative(SRC, f), logged: false, inAddress: false });
    }
    // Sent in a POST body, and only there.
    expect(read(join(SRC, 'pages/account/TrialLanding.tsx'))).toMatch(/trial\/link', \{ method: 'POST', body: \{ token \} \}/);
  });

  it('no page reads where a request came from, or sends where it came from (a client can forge both; correction 6)', () => {
    for (const f of code) {
      const src = read(f);
      expect({ file: relative(SRC, f), fromWhere: /document\.referrer|['"](origin|referer|referrer)['"]\s*:/i.test(src) }).toEqual({ file: relative(SRC, f), fromWhere: false });
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
