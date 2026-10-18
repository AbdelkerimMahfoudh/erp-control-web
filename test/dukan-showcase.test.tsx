import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DukanShowcase, STEP_MS } from '../src/components/public/DukanShowcase';
import { DEMO_FIGURES, DEMO_PROVIDERS, dukanDemo } from '../src/content/dukan-demo';
import { I18nProvider } from '../src/i18n';
import type { Language } from '../src/i18n/languages';
import { formatMru } from '../src/lib/format';

/**
 * The Dukan ERP showcase (the owner's approval of 2026-10-18): two walkthroughs of three steps, played only when asked,
 * once, and stopped by anything the reader does; nothing typed, nothing sent, nothing kept; the commission typed by the
 * operator and paid by the customer, shown apart from the amount, with no balance drawn.
 */
const LANGS: Language[] = ['en', 'fr', 'ar'];
const SRC = join(process.cwd(), 'src');

/** An IntersectionObserver the test drives: what it watches, and whether it was let go. */
class FakeObserver {
  static all: FakeObserver[] = [];
  targets = new Set<Element>();
  disconnected = false;
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }
  takeRecords() {
    return [];
  }
  leave() {
    const entries = [...this.targets].map((target) => ({ target, isIntersecting: false }) as unknown as IntersectionObserverEntry);
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}
const watching = () => FakeObserver.all.filter((o) => !o.disconnected && o.targets.size > 0);

/** `prefers-reduced-motion`, switchable while the page is open. */
function reducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('reduce') && matches;
    },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
  return (next: boolean) =>
    act(() => {
      matches = next;
      listeners.forEach((l) => l());
    });
}

function mount(lang: Language = 'en') {
  return render(
    <I18nProvider fixed={lang}>
      <DukanShowcase />
    </I18nProvider>,
  );
}

const panel = () => document.querySelector<HTMLElement>('.sc-panel[data-on="true"]')!;
const frame = () => panel().querySelector<HTMLElement>('.sc-frame[data-on="true"]')!;
const steps = () => [...panel().querySelectorAll<HTMLButtonElement>('.sc-step button')];
const current = () => steps().findIndex((b) => b.getAttribute('aria-current') === 'step');
const play = () => panel().querySelector<HTMLButtonElement>('.sc-play')!;
const tab = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((t) => t.textContent === name)!;
const amounts = (el: Element) => [...el.querySelectorAll('bdi')].map((b) => b.textContent ?? '').filter((t) => t.includes('MRU'));
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  reducedMotion(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the two walkthroughs', () => {
  it('two tabs of one size, one panel shown; three steps each, one screen at a time', () => {
    const d = dukanDemo.en;
    mount();
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent)).toEqual([d.electronics.tab, d.agent.tab]);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1']);
    const panels = [...document.querySelectorAll('[role="tabpanel"]')];
    expect(panels.map((p) => [p.getAttribute('data-on'), p.hasAttribute('inert')])).toEqual([
      ['true', false],
      ['false', true],
    ]);
    expect(panels[0]!.getAttribute('aria-labelledby')).toBe(tabs[0]!.id);
    for (const p of panels) expect(p.querySelectorAll('.sc-frame[data-on="true"]').length).toBe(1);

    const e = d.electronics;
    const expected = [
      [e.newSale, e.product, e.variant, e.price, e.inStock, 'IMEI'],
      [e.payment, e.saleAmount, e.received, e.method, e.cash, DEMO_PROVIDERS[1], e.paidInFull],
      [e.recorded, e.product, e.sold, e.today, e.sales, e.amount],
    ];
    expect(steps().map((b) => b.textContent)).toEqual(e.steps.map((s, i) => `${i + 1}${s.title}`));
    expected.forEach((words, i) => {
      fireEvent.click(steps()[i]!);
      expect(current()).toBe(i);
      for (const word of words) expect(frame().textContent).toContain(word);
      // The others are out of sight and out of the accessibility tree.
      const hidden = [...panel().querySelectorAll('.sc-frame')].filter((f) => f !== frame());
      expect(hidden.map((f) => f.getAttribute('aria-hidden'))).toEqual(['true', 'true']);
    });

    fireEvent.click(tab(d.agent.tab));
    expect(panel().id).toBe(panels[1]!.id);
    expect(current()).toBe(0);
    const g = d.agent;
    const agentWords = [
      [g.newExchange, g.provider, ...DEMO_PROVIDERS, g.directionLabel, g.receiveCash, g.giveCash],
      [g.amount, g.commission, g.commissionHint, g.operator, g.demoOperator, g.fromSignIn, g.example],
      [g.recorded, DEMO_PROVIDERS[0], g.amount, g.commission, g.today, g.exchanges, g.commissionEarned],
    ];
    agentWords.forEach((words, i) => {
      fireEvent.click(steps()[i]!);
      for (const word of words) expect(frame().textContent).toContain(word);
    });
  });

  it('both directions: the selector, the phone and the review agree, and changing it starts the walkthrough again', () => {
    const g = dukanDemo.en.agent;
    mount();
    fireEvent.click(tab(g.tab));
    const choices = () => [...panel().querySelectorAll<HTMLButtonElement>('.sc-direction-choice')];
    expect(choices().map((c) => [c.textContent, c.getAttribute('aria-pressed')])).toEqual([
      [g.receiveCash, 'true'],
      [g.giveCash, 'false'],
    ]);
    const chosenOnPhone = () => frame().querySelector('.sc-option[data-on="true"]:not(:first-child), .sc-options-stack .sc-option[data-on="true"]')?.textContent;
    expect(chosenOnPhone()).toBe(g.receiveCash);
    for (const [way, label] of [
      [1, g.giveCash],
      [0, g.receiveCash],
    ] as const) {
      fireEvent.click(steps()[2]!);
      fireEvent.click(choices()[way]!);
      expect(current()).toBe(0);
      expect(choices()[way]!.getAttribute('aria-pressed')).toBe('true');
      expect(chosenOnPhone()).toBe(label);
      fireEvent.click(steps()[1]!);
      expect(frame().querySelector('.sc-context')!.textContent).toBe(`${DEMO_PROVIDERS[0]} · ${label}`);
      fireEvent.click(steps()[2]!);
      expect(frame().querySelector('.sc-context')!.textContent).toBe(`${DEMO_PROVIDERS[0]} · ${label}`);
    }
  });

  it('the commission is typed by the operator and paid by the customer, shown apart, with no balance and no transfer', () => {
    for (const lang of LANGS) {
      const g = dukanDemo[lang].agent;
      mount(lang);
      fireEvent.click(tab(g.tab));
      fireEvent.click(steps()[1]!);
      const commissionRow = [...frame().querySelectorAll('.sc-row')].find((r) => r.querySelector('dt')?.textContent?.startsWith(g.commission))!;
      expect(commissionRow.querySelector('dt small')?.textContent).toBe(g.commissionHint);
      expect(amounts(commissionRow)).toEqual([formatMru(DEMO_FIGURES.commission, lang)]);
      // The operator is the person signed in: shown, never a field or a choice.
      const operatorRow = [...frame().querySelectorAll('.sc-row')].find((r) => r.textContent?.includes(g.demoOperator))!;
      expect(operatorRow.querySelector('dt small')?.textContent).toBe(g.fromSignIn);
      expect(document.querySelectorAll('.showcase input, .showcase select, .showcase textarea, .showcase form, .showcase [contenteditable]').length).toBe(0);
      expect(operatorRow.querySelector('button')).toBeNull();
      // The review: the commission in its own list, apart from the amount.
      fireEvent.click(steps()[2]!);
      const lists = [...frame().querySelectorAll(':scope > dl.sc-rows')];
      expect(lists.map((l) => amounts(l))).toEqual([[formatMru(DEMO_FIGURES.exchangeAmount, lang)], [formatMru(DEMO_FIGURES.commission, lang)]]);
      expect(lists[1]!.classList.contains('sc-commission')).toBe(true);
      // Never the amount and the commission added up or taken apart: no balance arithmetic at all.
      for (const n of [DEMO_FIGURES.exchangeAmount + DEMO_FIGURES.commission, DEMO_FIGURES.exchangeAmount - DEMO_FIGURES.commission]) {
        expect(document.querySelector('.showcase')!.textContent).not.toContain(formatMru(n, lang));
      }
      cleanup();
    }
    // In every language: paid by the customer, no fixed rate, nothing sent, no bank, no provider paying or confirming.
    const words = { en: /balance|float|transfer|\bsent\b|\bbank|verified|confirmed by|partner/i, fr: /solde|virement|envoyé|banque|bancaire|vérifié|partenaire/i, ar: /مصرف|بنك|تحويل|أُرسل|تم الإرسال|شريك/ };
    for (const lang of LANGS) {
      const all = JSON.stringify(dukanDemo[lang]);
      expect({ lang, found: all.match(words[lang]) }).toEqual({ lang, found: null });
    }
    expect(dukanDemo.en.agent.commission).toBe('Commission paid by the customer');
    expect(dukanDemo.en.agent.steps[1].body).toMatch(/the commission the customer pays — there is no fixed rate/);
    expect(dukanDemo.fr.agent.steps[1].body).toMatch(/payée par le client — il n’y a pas de taux fixe/);
    expect(dukanDemo.ar.agent.steps[1].body).toMatch(/التي يدفعها الزبون — لا توجد نسبة ثابتة/);
  });

  it('the figures agree with one another, in every language', () => {
    for (const lang of LANGS) {
      const d = dukanDemo[lang];
      mount(lang);
      const sale = formatMru(DEMO_FIGURES.salePrice, lang);
      const electronics = document.querySelectorAll('[role="tabpanel"]')[0]!;
      const agent = document.querySelectorAll('[role="tabpanel"]')[1]!;
      // One phone at 20,000 MRU: priced, paid, received and counted in the day at the same amount; one sale today.
      expect(new Set(amounts(electronics))).toEqual(new Set([sale]));
      expect(amounts(electronics).length).toBe(5);
      expect(new Set(amounts(agent))).toEqual(new Set([formatMru(DEMO_FIGURES.exchangeAmount, lang), formatMru(DEMO_FIGURES.commission, lang)]));
      fireEvent.click(steps()[2]!);
      const summary = frame().querySelector('.sc-summary')!;
      expect([...summary.querySelectorAll('.sc-row')].map((r) => r.querySelector('dd')!.textContent)).toEqual([new Intl.NumberFormat(lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-GB').format(1), sale]);
      fireEvent.click(tab(d.agent.tab));
      fireEvent.click(steps()[2]!);
      expect([...frame().querySelectorAll('.sc-summary .sc-row dd')].map((dd) => dd.textContent)).toEqual([
        new Intl.NumberFormat(lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-GB').format(1),
        formatMru(DEMO_FIGURES.commission, lang),
      ]);
      // Every amount, provider and identifier keeps its own reading order inside Arabic.
      for (const b of document.querySelectorAll('.sc-frames bdi')) expect(b.getAttribute('dir')).toBe('ltr');
      expect([...document.querySelectorAll('.sc-frames bdi')].map((b) => b.textContent)).toEqual(expect.arrayContaining([...DEMO_PROVIDERS, `IMEI ${DEMO_FIGURES.imei}`]));
      expect(document.querySelector('.sc-note')!.textContent).toBe(d.note);
      cleanup();
    }
  });
});

describe('playing the walkthrough', () => {
  it('plays only when asked, once, and stops on the result; Pause holds it; Replay starts it again', () => {
    vi.useFakeTimers();
    const d = dukanDemo.en;
    mount();
    // Nothing moves by itself.
    tick(STEP_MS * 5);
    expect(current()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(play().textContent).toBe(d.play);

    fireEvent.click(play());
    expect(play().textContent).toBe(d.pause);
    expect(panel().querySelector('.sc-step[data-playing]')).toBe(steps()[0]!.parentElement);
    expect(vi.getTimerCount()).toBe(1);
    tick(STEP_MS - 1);
    expect(current()).toBe(0);
    tick(1);
    expect(current()).toBe(1);
    tick(STEP_MS);
    expect(current()).toBe(2);
    expect(play().textContent).toBe(d.replay);
    expect(vi.getTimerCount()).toBe(0);
    tick(STEP_MS * 5);
    expect(current()).toBe(2);

    fireEvent.click(play());
    expect(current()).toBe(0);
    expect(play().textContent).toBe(d.pause);
    tick(STEP_MS / 2);
    fireEvent.click(play());
    expect(play().textContent).toBe(d.play);
    expect(vi.getTimerCount()).toBe(0);
    tick(STEP_MS * 5);
    expect(current()).toBe(0);
    // Play goes on from where it stopped.
    fireEvent.click(play());
    tick(STEP_MS);
    expect(current()).toBe(1);
    // Choosing a step stops it there.
    fireEvent.click(steps()[0]!);
    expect(play().textContent).toBe(d.play);
    tick(STEP_MS * 5);
    expect(current()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('switching activity or direction, however fast, stops and resets it with no timer left behind', () => {
    vi.useFakeTimers();
    const d = dukanDemo.en;
    mount();
    fireEvent.click(play());
    tick(STEP_MS + 10);
    for (const name of [d.agent.tab, d.electronics.tab, d.agent.tab, d.electronics.tab, d.agent.tab]) {
      fireEvent.click(tab(name));
      expect(current()).toBe(0);
      fireEvent.click(play());
      tick(STEP_MS / 3);
      expect(vi.getTimerCount()).toBe(1);
    }
    for (const choice of [1, 0, 1]) {
      fireEvent.click(panel().querySelectorAll('.sc-direction-choice')[choice]!);
      expect(current()).toBe(0);
      expect(play().textContent).toBe(d.play);
      expect(vi.getTimerCount()).toBe(0);
      fireEvent.click(play());
    }
    tick(STEP_MS);
    tick(STEP_MS);
    expect(current()).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
    // The other panel never moved.
    const other = document.querySelectorAll('[role="tabpanel"]')[0]!;
    expect(other.querySelector('.sc-frame[data-on="true"]')).toBe(other.querySelectorAll('.sc-frame')[0]);
  });

  it('pauses when its phone leaves the screen or the page is hidden, never resumes by itself, and lets go of everything', () => {
    vi.useFakeTimers();
    const d = dukanDemo.en;
    const { unmount } = mount();
    // Idle: nothing is watched.
    expect(watching()).toEqual([]);
    fireEvent.click(play());
    expect(watching().length).toBe(1);
    expect([...watching()[0]!.targets]).toEqual([panel().querySelector('.sc-phone')]);
    act(() => watching()[0]!.leave());
    expect(play().textContent).toBe(d.play);
    expect(watching()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    tick(STEP_MS * 3);
    expect(current()).toBe(0);

    fireEvent.click(play());
    let state: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state);
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(play().textContent).toBe(d.play);
    expect(vi.getTimerCount()).toBe(0);
    state = 'visible';
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    tick(STEP_MS * 3);
    expect(play().textContent).toBe(d.play);
    expect(current()).toBe(0);

    // Leaving the page while it plays leaves no timer, observer or listener behind.
    const removed = vi.spyOn(document, 'removeEventListener');
    fireEvent.click(play());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(watching()).toEqual([]);
    expect(removed.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true);
  });

  it('with reduced motion there is nothing to play — at load, or switched on while it plays — and nothing restarts after', () => {
    vi.useFakeTimers();
    const d = dukanDemo.en;
    reducedMotion(true);
    mount();
    fireEvent.click(play());
    expect(play().textContent).toBe(d.play);
    expect(vi.getTimerCount()).toBe(0);
    // The steps are all there, chosen one by one.
    fireEvent.click(steps()[2]!);
    expect(current()).toBe(2);
    cleanup();

    const set = reducedMotion(false);
    mount();
    fireEvent.click(play());
    tick(STEP_MS / 2);
    set(true);
    expect(play().textContent).toBe(d.play);
    expect(vi.getTimerCount()).toBe(0);
    tick(STEP_MS * 3);
    expect(current()).toBe(0);
    set(false);
    tick(STEP_MS * 3);
    expect(current()).toBe(0);
    expect(play().textContent).toBe(d.play);
    // The stylesheet removes the button itself from the first paint; the step time is the stylesheet's too.
    const css = readFileSync(join(SRC, 'theme/public.css'), 'utf8');
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.sc-play \{\s*display: none;\s*\}/);
    expect(css).toContain(`--sc-step: ${STEP_MS}ms;`);
  });
});

describe('keyboard, languages and what it never does', () => {
  it('the tabs follow the arrow keys in the page’s direction; one tab stop; the hidden panel is out of reach', () => {
    for (const lang of LANGS) {
      const d = dukanDemo[lang];
      mount(lang);
      expect(document.documentElement.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
      const first = tab(d.electronics.tab);
      const second = tab(d.agent.tab);
      first.focus();
      const next = lang === 'ar' ? 'ArrowLeft' : 'ArrowRight';
      const back = lang === 'ar' ? 'ArrowRight' : 'ArrowLeft';
      fireEvent.keyDown(first, { key: next });
      expect(document.activeElement).toBe(second);
      expect(second.getAttribute('aria-selected')).toBe('true');
      expect([first.tabIndex, second.tabIndex]).toEqual([-1, 0]);
      expect(document.querySelectorAll('[role="tabpanel"]')[0]!.hasAttribute('inert')).toBe(true);
      fireEvent.keyDown(second, { key: next });
      expect(document.activeElement).toBe(first);
      fireEvent.keyDown(first, { key: back });
      expect(document.activeElement).toBe(second);
      fireEvent.keyDown(second, { key: 'Home' });
      expect(document.activeElement).toBe(first);
      fireEvent.keyDown(first, { key: 'End' });
      expect(document.activeElement).toBe(second);
      // Stacked on a narrow screen, the tabs answer up and down as well.
      fireEvent.keyDown(second, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(first);
      fireEvent.keyDown(first, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(second);
      // Every control is a real button with a name; the steps describe themselves and point at the screen.
      for (const b of panel().querySelectorAll('button')) {
        expect(b.getAttribute('type')).toBe('button');
        expect((b.textContent ?? '').trim().length).toBeGreaterThan(0);
      }
      const screen = panel().querySelector('.sc-frames')!;
      expect(screen.getAttribute('role')).toBe('group');
      expect(screen.getAttribute('aria-label')).toBe(d.screenLabel);
      for (const b of steps()) {
        expect(b.getAttribute('aria-controls')).toBe(screen.id);
        expect(document.getElementById(b.getAttribute('aria-describedby')!)?.tagName).toBe('P');
      }
      // Nothing is announced as it plays: no live region anywhere.
      expect(document.querySelector('.showcase [aria-live], .showcase [role="status"], .showcase [role="alert"]')).toBeNull();
      cleanup();
    }
  });

  it('reads without a script: the prerendered markup holds the first walkthrough, its steps and the disclosure', () => {
    for (const lang of LANGS) {
      const d = dukanDemo[lang];
      const html = renderToString(
        <I18nProvider fixed={lang}>
          <DukanShowcase />
        </I18nProvider>,
      );
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const [electronics, agent] = [...doc.querySelectorAll('[role="tabpanel"]')];
      expect(electronics!.getAttribute('data-on')).toBe('true');
      expect(electronics!.hasAttribute('inert')).toBe(false);
      expect(agent!.hasAttribute('inert')).toBe(true);
      for (const s of d.electronics.steps) expect(electronics!.textContent).toContain(s.title);
      expect(electronics!.querySelector('.sc-frame[data-on="true"]')!.textContent).toContain(d.electronics.product);
      expect(doc.querySelector('.sc-note')!.textContent).toBe(d.note);
    }
  });

  it('asks nothing of the network, the storage, the camera or the reader', () => {
    vi.useFakeTimers();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const stored = vi.spyOn(Storage.prototype, 'setItem');
    const cookie = vi.spyOn(document, 'cookie', 'set');
    for (const lang of LANGS) {
      const d = dukanDemo[lang];
      mount(lang);
      stored.mockClear();
      for (const name of [d.electronics.tab, d.agent.tab]) {
        fireEvent.click(tab(name));
        for (const b of steps()) fireEvent.click(b);
        for (const c of panel().querySelectorAll('.sc-direction-choice')) fireEvent.click(c);
        fireEvent.click(play());
        tick(STEP_MS * 3);
      }
      expect(fetch).not.toHaveBeenCalled();
      expect(beacon).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
      expect(stored).not.toHaveBeenCalled();
      expect(cookie).not.toHaveBeenCalled();
      cleanup();
    }
    for (const file of ['components/public/DukanShowcase.tsx', 'content/dukan-demo.ts', 'lib/motion.ts']) {
      const src = readFileSync(join(SRC, file), 'utf8');
      expect({ file, found: src.match(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie|getUserMedia|mediaDevices|navigator\.geolocation|import\(|https?:\/\//) }).toEqual({ file, found: null });
    }
  });
});
