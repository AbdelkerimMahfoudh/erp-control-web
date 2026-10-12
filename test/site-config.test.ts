import { describe, expect, it } from 'vitest';
import { formatProblems, INPUTS, looksLikeTestValue, readInputs, releaseProblems, type InputName } from '../src/config/schema';
import { BLOCKERS } from '../src/content/blockers';
import { publishedBlockers } from '../src/content';

/** Plausible, invented values with no test marker — a release must accept them when nothing else blocks it. */
const COMPLETE: Record<string, string> = {
  VITE_PUBLIC_SITE_ORIGIN: 'https://www.company-domain.mr',
  VITE_API_BASE: 'https://api.company-domain.mr/api/v1',
  VITE_ORGANIZATION_LEGAL_NAME: 'Registered Name SARL',
  VITE_ORGANIZATION_LEGAL_FORM: 'SARL',
  VITE_ORGANIZATION_REGISTRATION_NUMBER: 'RC 0000',
  VITE_ORGANIZATION_CITY: 'Nouakchott',
  VITE_ORGANIZATION_ADDRESS: 'Street 1',
  VITE_SUPPORT_EMAIL: 'support@company-domain.mr',
  VITE_PRIVACY_EMAIL: 'privacy@company-domain.mr',
  VITE_ACCOUNT_DELETION_CHANNEL: 'whatsapp',
  VITE_LEGAL_EFFECTIVE_DATE: '2026-11-01',
};

describe('the production refusal (docs/74 §3)', () => {
  it('refuses a blank configuration and names every required input', () => {
    const problems = releaseProblems({}, []);
    const missing = problems.filter((p) => p.problem === 'missing').map((p) => p.env).sort();
    const required = Object.values(INPUTS)
      .filter((s) => s.required && !('fallback' in s))
      .map((s) => s.env)
      .sort();
    expect(missing).toEqual(required);
    // TSX-MR and Mauritania were given in the brief: they default, and are never reported missing.
    expect(missing).not.toContain('VITE_ORGANIZATION_DISPLAY_NAME');
    expect(missing).not.toContain('VITE_ORGANIZATION_COUNTRY');
    expect(formatProblems(problems)).toMatch(/Nothing was published/);
  });

  it('accepts a complete, real configuration when no legal blocker remains', () => {
    expect(releaseProblems(COMPLETE, [])).toEqual([]);
  });

  it('refuses every published legal blocker by name', () => {
    const problems = releaseProblems(COMPLETE, BLOCKERS);
    expect(problems.map((p) => p.problem)).toEqual(BLOCKERS.map(() => 'legal_blocker'));
    expect(problems.map((p) => p.detail.split(':')[0])).toEqual(BLOCKERS.map((b) => b.id));
  });

  it('refuses test values, plain-HTTP origins, malformed addresses and an unsupported deletion channel', () => {
    const cases: [string, string, string][] = [
      ['VITE_SUPPORT_EMAIL', 'support@preview.invalid', 'test_value'],
      ['VITE_ORGANIZATION_LEGAL_NAME', '[TEST] Registered legal name', 'test_value'],
      ['VITE_PUBLIC_SITE_ORIGIN', 'http://www.company-domain.mr', 'not_https'],
      ['VITE_API_BASE', 'http://api.company-domain.mr/api/v1', 'not_https'],
      ['VITE_PUBLIC_SITE_ORIGIN', 'https://www.company-domain.mr/', 'malformed'],
      ['VITE_API_BASE', 'https://localhost:3010/api/v1', 'test_value'],
      ['VITE_PRIVACY_EMAIL', 'not-an-address', 'malformed'],
      ['VITE_SUPPORT_EMAIL', 'a@b.mr\r\nBcc: x@y.mr', 'malformed'],
      ['VITE_ACCOUNT_DELETION_CHANNEL', 'email', 'malformed'],
      ['VITE_LEGAL_EFFECTIVE_DATE', '01/11/2026', 'malformed'],
      ['VITE_ORGANIZATION_ADDRESS', '<script>', 'malformed'],
    ];
    for (const [env, value, problem] of cases) {
      const found = releaseProblems({ ...COMPLETE, [env]: value }, []);
      expect({ env, value, found: found.map((p) => `${p.env}:${p.problem}`) }).toEqual({ env, value, found: [`${env}:${problem}`] });
    }
  });

  it('the published texts carry blockers today, so a production build is refused until they are decided', () => {
    const ids = publishedBlockers().map((b) => b.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(BLOCKERS.map((b) => b.id)).toContain(id);
  });
});

describe('preview values never reach production', () => {
  it('a preview fills every blank with a marked test value; production fills nothing', () => {
    const preview = readInputs({}, 'preview');
    const production = readInputs({}, 'production');
    for (const name of Object.keys(INPUTS) as InputName[]) {
      const spec = INPUTS[name];
      if ('fallback' in spec) {
        expect(production.inputs[name]).toBe(spec.fallback);
        continue;
      }
      expect(production.inputs[name]).toBe('');
      expect(production.filled).not.toContain(name);
      const v = preview.inputs[name];
      // Blank, or a value that is visibly a test value.
      expect({ name, ok: v === '' || looksLikeTestValue(v) }).toEqual({ name, ok: true });
    }
  });

  it('a value given in the environment is used as given, in every mode', () => {
    for (const mode of ['preview', 'production'] as const) expect(readInputs(COMPLETE, mode).inputs.legalName).toBe('Registered Name SARL');
  });
});
