import { describe, expect, it } from 'vitest';
import { formatTimeLeft } from '../src/lib/format';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

/** 0131: the automatic trial on the portal — time left from the server's end, and an old link told the trial is already active. */
describe('the automatic trial on the portal', () => {
  const end = '2026-11-13T10:00:00.000Z';
  const at = (iso: string) => new Date(iso).getTime();
  it('time left in days and hours, in each language; nothing once it ended', () => {
    expect(formatTimeLeft(end, 'en', at('2026-11-06T10:00:00.000Z'))).toBe('7 days, 0 hours');
    expect(formatTimeLeft(end, 'en', at('2026-11-12T22:00:00.000Z'))).toBe('12 hours');
    expect(formatTimeLeft(end, 'fr', at('2026-11-10T09:00:00.000Z'))?.replace(/\s/gu, ' ')).toBe('3 jours et 1 heure');
    expect(formatTimeLeft(end, 'ar', at('2026-11-10T09:00:00.000Z'))).toBeTruthy();
    expect(formatTimeLeft(end, 'en', at('2026-11-13T10:00:00.000Z'))).toBeNull();
    expect(formatTimeLeft(null, 'en')).toBeNull();
  });
  it('an old link’s answer says the trial is already active, in every language', () => {
    for (const c of [en, fr, ar]) expect(c['trial.alreadyActive']).toContain('{date}');
    expect(en['trial.alreadyActive']).toBe('Your free trial is already active. It ends on {date}.');
  });
});
