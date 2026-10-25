import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { terms } from '../src/content/legal-terms';
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
    expect(read(join(SRC, 'pages/portal/Subscription.tsx'))).toMatch(/platform\/my-subscription\/activity-options/);
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
const TRIAL_INSTANT = String.raw`claimedAt|startedAt|endsAt|wouldStartAt|wouldEndAt|lastAttemptAt|resendAvailableAt|expiryRecordedAt|startsAt|effectiveAt`;
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
      [join('components', 'trial.tsx'), join('lib', 'trial.ts'), join('pages', 'portal', 'TrialCard.tsx'), join('pages', 'admin', 'BusinessTrial.tsx'), join('pages', 'admin', 'TrialClaims.tsx')].sort(),
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

/*
 * A store or seat paid for during the free trial (D176, 2026-10-15) starts when the trial ends: the server sends that
 * start as `activation.startsAt` with the zone the row belongs to (`activation.timeZone`, the business's). It is told
 * like every trial date — through formatInstant, with that row's own zone and the zone's name — never in this browser's
 * zone, never in a zone the page holds for something else (the queue lists many businesses), and never worked out here.
 * `effectiveAt` is a fact the page reads, never a date it formats.
 */
describe('a scheduled store or seat starts on the server’s instant, told in the row’s own zone (D176)', () => {
  /** Every read of an activation's start: `<base>.startsAt` where the base is the row's `activation`. */
  const activationReads = (line: string) => [...line.matchAll(/([\w.?]*\bactivation)\??\.startsAt\b/g)].map((m) => m[1]!.replace(/\?/g, ''));

  it('requests.tsx tells the start only through formatInstant, with the row’s own zone', () => {
    const lines = executable(read(join(SRC, 'components', 'requests.tsx')));
    const reads = lines.filter((line) => /\bstartsAt\b/.test(line));
    expect(reads).toEqual([expect.stringContaining('formatInstant(activation.startsAt, activation.timeZone, lang)')]);
    // The activation is the row's own, and nothing in the file formats a date any other way.
    expect(lines.filter((line) => /\bactivation = /.test(line))).toEqual([expect.stringMatching(/const activation = r\.activation;$/)]);
    expect(lines.filter((line) => /formatDate(Time)?\(|toLocale\w*String|getTimezoneOffset|resolvedOptions|new Date\(/.test(line))).toEqual([]);
  });

  it('no source formats an activation’s start except with that same activation’s zone, and none formats `effectiveAt`', () => {
    let found = 0;
    for (const f of code) {
      for (const line of executable(read(f))) {
        for (const base of activationReads(line)) {
          found += 1;
          expect({ file: relative(SRC, f), line: line.trim() }).toEqual({ file: relative(SRC, f), line: expect.stringContaining(`formatInstant(${base}.startsAt, ${base}.timeZone, lang)`) });
        }
        expect({ file: relative(SRC, f), formatsEffectiveAt: /format\w*\([^)]*\beffectiveAt\b/.test(line) }).toEqual({ file: relative(SRC, f), formatsEffectiveAt: false });
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('no start leaves the object it came with: every `startsAt` read is an activation’s, told in its own zone, or the trial’s access, told in the trial’s', () => {
    // A start taken out of its activation — destructured, or kept in a variable — would escape the rule above.
    const KNOWN = [/formatInstant\(([\w.?]*\bactivation)\.startsAt, \1\.timeZone, lang\)/g, /\bat\(after\.startsAt\)/g];
    const stray: string[] = [];
    for (const f of code) {
      if (relative(SRC, f) === join('api', 'types.ts')) continue; // where the fields are declared
      for (const line of executable(read(f))) {
        if (/\bstartsAt\b/.test(KNOWN.reduce((rest, known) => rest.replace(known, ''), line))) stray.push(`${relative(SRC, f)}: ${line.trim()}`);
      }
    }
    expect(stray).toEqual([]);
    // `at` is the trial card's formatter: the trial's own zone, with the zone's name.
    expect(read(join(SRC, 'components', 'trial.tsx'))).toMatch(/const at = \(iso: string \| null\) => formatInstant\(iso, trial\.timeZone, lang\);/);
  });

  it('a request’s status is put into words by one mapping, so a paid add-on never borrows the renewal’s "scheduled"', () => {
    const MAPPING = join('components', 'ui.tsx');
    for (const f of code) {
      if (relative(SRC, f) === MAPPING) continue;
      const hits = executable(read(f)).filter((line) => /account\.requests\.status\.\$\{/.test(line));
      expect({ file: relative(SRC, f), hits }).toEqual({ file: relative(SRC, f), hits: [] });
    }
    expect(read(join(SRC, MAPPING))).toMatch(/status === 'scheduled' \? 'account\.requests\.status\.paidScheduled' : /);
  });
});

/*
 * The history on the account page and in the console (review R4-01) says each event's kind in words, and the free
 * trial's own events from the trial's facts in the business's zone — one component tells it for both pages, and the
 * server's note, English with raw UTC instants, is never shown for the trial's events. No source shows a server code
 * by swapping its underscores for spaces (the console's pending queue did, review R4-13).
 */
describe('the history says every event in words, and the trial’s in the business’s zone', () => {
  it('no source shows a server code by swapping its underscores for spaces — the history, the pending queue, anywhere', () => {
    for (const f of code) {
      const hits = executable(read(f)).filter((line) => /\.replace\(\/_\/g/.test(line));
      expect({ file: relative(SRC, f), hits }).toEqual({ file: relative(SRC, f), hits: [] });
    }
  });

  it('both timelines are the one component: neither page prints an event’s kind, note or date itself', () => {
    for (const page of [join('pages', 'portal', 'Subscription.tsx'), join('pages', 'admin', 'Business.tsx')]) {
      const src = read(join(SRC, page));
      expect({ page, timeline: /<Timeline\b/.test(src), own: /\be\.(kind|note|createdAt)\b/.test(src) }).toEqual({ page, timeline: true, own: false });
    }
  });

  it('the trial’s and the grace’s events are told from catalogue sentences, dated in the business’s zone; only other kinds print their note', () => {
    const src = read(join(SRC, 'components', 'timeline.tsx'));
    expect(src.match(/event\.note/g)).toHaveLength(2);
    expect(src).toMatch(/default:\s*\n(\s*\/\/.*\n)?\s*return event\.note \? \(\s*<>\s*\{' — '\}\s*<bdi>\{event\.note\}<\/bdi>/);
    expect(src).toMatch(/\(TRIAL_KINDS\.has\(e\.kind\) \|\| GRACE_KINDS\.has\(e\.kind\)\) && trial \? formatInstant\(e\.createdAt, trial\.timeZone, lang\)/);
    for (const kind of ['trial_eligible', 'trial_claimed', 'trial_expired', 'grace_started', 'grace_unavailable']) expect(src).toContain(`case '${kind}':`);
  });
});

/*
 * The portal session (0099; docs/101 §4) is two HttpOnly cookies no script can read, and the session's CSRF token in a
 * module variable for the visit. The setup link and its token are gone: the portal instructions name one address.
 */
describe('the portal session lives in its cookies and in memory only, and only the server decides', () => {
  it('no source keeps anything in a cookie, IndexedDB or the cache, sends a bearer, or logs from a trial source', () => {
    for (const f of code) expect({ file: relative(SRC, f), stored: /document\.cookie|indexedDB|\bcaches\./.test(read(f)) }).toEqual({ file: relative(SRC, f), stored: false });
    for (const f of code) expect({ file: relative(SRC, f), bearer: /Authorization|Bearer /.test(executable(read(f)).join('\n')) }).toEqual({ file: relative(SRC, f), bearer: false });
    for (const f of trialFiles) expect({ file: relative(SRC, f), logged: /console\./.test(read(f)) }).toEqual({ file: relative(SRC, f), logged: false });
  });

  it('the CSRF token is kept in a module variable, sent in its header on a POST only, and nothing reads a token from the address', () => {
    const owner = read(join(SRC, 'auth/owner.ts'));
    expect(owner).toMatch(/^let csrfToken: string \| null = null;$/m);
    expect(owner).toMatch(/options\.method === 'POST' && csrfToken \? \{ 'x-csrf-token': csrfToken \} : undefined/);
    const portal = code.filter((f) => /^(pages[\\/]portal[\\/]|auth[\\/]owner\.ts$|components[\\/]trial\.tsx$|lib[\\/]trial\.ts$)/.test(relative(SRC, f)));
    expect(portal.length).toBeGreaterThanOrEqual(6);
    for (const f of portal) {
      const src = executable(read(f)).join('\n');
      expect({ file: relative(SRC, f), fromAddress: /URLSearchParams|location\.(hash|search)|\bsearchParams\b|useLocation/.test(src) }).toEqual({ file: relative(SRC, f), fromAddress: false });
    }
  });

  it('the registration link’s landing reads one parameter, `r`, and takes it out of the address at once (0103)', () => {
    const landing = executable(read(join(SRC, 'pages/join/Join.tsx'))).join('\n');
    expect([...landing.matchAll(/\.get\('(\w+)'\)/g)].map((m) => m[1])).toEqual(['r']);
    expect(landing).toMatch(/window\.history\.replaceState\(window\.history\.state, '', window\.location\.pathname\)/);
    // Asked about by POST, never logged in an address: the application form receives it in memory (router state).
    expect(landing).toMatch(/request<AcquisitionLookup>\('platform\/acquisition\/link', \{ method: 'POST'/);
    const apply = executable(read(join(SRC, 'pages/public/Apply.tsx'))).join('\n');
    expect(apply).not.toMatch(/URLSearchParams|location\.(hash|search)|searchParams/);
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

  /**
   * The terms say what Dukan ERP is not — not a bank, not Bankily, not Sedad (the owner's brief of 2026-10-16) — in one
   * sentence per language, which must be a denial. It is cut out exactly once before the scan, like the agent's trade.
   */
  const NOT_A_PROVIDER = (['en', 'fr', 'ar'] as const).map((lang) => terms[lang].sections.find((s) => s.id === 'not_bank')!.blocks[0]!);

  it('the terms name a provider only to say Dukan ERP is not one', () => {
    const negations = { en: /is not a bank/, fr: /n’est ni une banque/, ar: /وهو ليس مصرفًا/ } as const;
    (['en', 'fr', 'ar'] as const).forEach((lang, i) => {
      const block = NOT_A_PROVIDER[i]!;
      expect(block.kind).toBe('p');
      expect({ lang, denial: negations[lang].test((block as { text: string }).text) }).toEqual({ lang, denial: true });
    });
  });

  /**
   * The showcase's agent walkthrough (the owner's approval of 2026-10-18) shows the provider the operator picks, as the
   * counter in the app does: two labels, declared once, on one line of `content/dukan-demo.ts`. It is cut out exactly
   * once, like the agent's trade; the labels' use is pinned below.
   */
  const DEMO_PROVIDERS_LINE = "export const DEMO_PROVIDERS = ['Bankily', 'Sedad'] as const;";
  const DEMO_FILE = join('content', 'dukan-demo.ts');

  it('the showcase names a provider only as a label of its walkthrough', () => {
    for (const f of code) {
      const src = read(f);
      const rel = relative(SRC, f);
      if (rel === DEMO_FILE) expect(src.split(DEMO_PROVIDERS_LINE).length - 1).toBe(1);
      // The labels are read in one component only, which never writes them into a sentence.
      else if (/\bDEMO_PROVIDERS\b/.test(src)) expect(rel).toBe(join('components', 'public', 'DukanShowcase.tsx'));
    }
    const showcase = read(join(SRC, 'components', 'public', 'DukanShowcase.tsx'));
    expect(showcase.match(/DEMO_PROVIDERS\[\d\]|DEMO_PROVIDERS\.map/g)?.sort()).toEqual(['DEMO_PROVIDERS.map', 'DEMO_PROVIDERS[0]', 'DEMO_PROVIDERS[1]']);
    expect(showcase).not.toMatch(/sent|envoy|أُرسل|verified|vérifié|partner|partenaire|bank\b|banque|مصرف|بنك/i);
  });

  it('no page names a payment destination number or a provider', () => {
    for (const f of code) {
      let src = read(f);
      const trade = AGENT_TRADE[relative(SRC, f)];
      if (trade) {
        expect({ file: relative(SRC, f), found: src.split(trade).length - 1 }).toEqual({ file: relative(SRC, f), found: 1 });
        src = src.replace(trade, '');
      }
      if (relative(SRC, f) === DEMO_FILE) src = src.replace(DEMO_PROVIDERS_LINE, '');
      if (relative(SRC, f) === join('content', 'legal-terms.ts')) {
        for (const block of NOT_A_PROVIDER) {
          const text = (block as { text: string }).text.replace(/'/g, "\\'");
          expect({ file: relative(SRC, f), found: src.split(text).length - 1 }).toEqual({ file: relative(SRC, f), found: 1 });
          src = src.replace(text, '');
        }
      }
      expect({ file: relative(SRC, f), ok: !/bankily|masrivi|sedad|bimbank/i.test(src) }).toEqual({ file: relative(SRC, f), ok: true });
    }
  });
});

/*
 * What a public build may carry (docs/96; the brief "Final Legal, Identity, Portal and Website Production Preparation"):
 * a production release build, with every text approved, failed its own bundle audit — the input table and its
 * preview values were in the page, and so was the API client with its development address. The page now receives its
 * inputs computed at build time, and a public build takes stubs for everything that needs the API.
 */
describe('a public build carries no API and no preview value', () => {
  it('the page reads its inputs inlined by the build, never the table of rules and preview values', () => {
    const site = read(join(SRC, 'config/site.ts'));
    expect(site).toMatch(/__SITE_INPUTS__/);
    expect(site).not.toMatch(/import\s*\{[^}]*\breadInputs\b/);
    expect(site).toMatch(/import type \{[^}]*\} from '\.\/schema'/);
    // The surface is named from its own module, which holds no table of inputs.
    expect(site).not.toMatch(/^import \{[^}]*\} from '\.\/schema'/m);
    expect(read(join(SRC, 'config/surface.ts'))).not.toMatch(/^import /m);
  });

  it('the stubs a public build takes hold no request, address or credential', () => {
    for (const f of ['api/client.public.ts', 'components/PlanPricing.public.tsx', 'pages/public/Apply.public.tsx', 'protected-areas.public.tsx']) {
      const text = read(join(SRC, f));
      expect({ f, fetch: /\bfetch\s*\(|credentials|127\.0\.0\.1|localhost|platform\//.test(text) }).toEqual({ f, fetch: false });
    }
    const config = read(join(process.cwd(), 'vite.config.ts'));
    for (const stub of ['protected-areas.public.tsx', 'api/client.public.ts', 'components/PlanPricing.public.tsx', 'pages/public/Apply.public.tsx']) expect(config).toContain(stub);
  });

  it('every import of the protected areas, from any folder, is one the public build replaces', () => {
    // `components/RouteScroll.tsx` imports them from one level down; a pattern matching only `./protected-areas` once let
    // the real areas into the public build's module graph, where a library with side effects survived tree-shaking.
    const alias = /^(\.{1,2}\/)+protected-areas$/;
    expect(read(join(process.cwd(), 'vite.config.ts'))).toContain(String.raw`{ find: /^(\.{1,2}\/)+protected-areas$/`);
    const imports = code.flatMap((f) => [...read(f).matchAll(/from '([^']*protected-areas)'/g)].map((m) => m[1]!));
    expect(imports.length).toBeGreaterThanOrEqual(2);
    for (const specifier of imports) expect({ specifier, replaced: alias.test(specifier) }).toEqual({ specifier, replaced: true });
  });
});
