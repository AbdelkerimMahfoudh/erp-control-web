import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe('the website never computes a price', () => {
  it('no source multiplies or adds a price field', () => {
    const pattern = /(branchMonthly|extraStaffMonthly|extraSeatMonthly|monthlyAmount|seatFee|monthlyTotal|staffFee|branchFee|assessedTotal)\s*[*+\-/]\s*\w|\w\s*[*+\-/]\s*(branchMonthly|extraStaffMonthly|extraSeatMonthly|monthlyAmount|seatFee|monthlyTotal|staffFee|branchFee|assessedTotal)\b/;
    for (const f of code) {
      const hits = read(f)
        .split('\n')
        .filter((line: string) => pattern.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*'));
      expect({ file: relative(SRC, f), hits }).toEqual({ file: relative(SRC, f), hits: [] });
    }
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

  it('no page names a payment destination number or a provider', () => {
    for (const f of code) {
      const src = read(f);
      expect({ file: relative(SRC, f), ok: !/bankily|masrivi|sedad|bimbank/i.test(src) }).toEqual({ file: relative(SRC, f), ok: true });
    }
  });
});
