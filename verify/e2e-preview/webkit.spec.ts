import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { dukanDemo } from '../src/content/dukan-demo';
import { pathOf } from '../src/site/routes';

/**
 * The Dukan ERP illustration and the card motion in WebKit (Playwright's WebKit: the engine behind Safari), under an
 * iPhone profile (viewport, 3× density, touch, mobile user agent) and a desktop Safari profile
 * (playwright.preview.config.ts). This is browser automation on Linux: it is NOT an iPhone, and nothing here stands for
 * a check on a physical device.
 *
 * Copied by .github/workflows/verify-preview.yml into the website checkout of the commit under review, so it imports
 * that commit's own words.
 */
const EV = process.env.EV ?? 'webkit-evidence';
const shots = join(EV, 'screenshots');
mkdirSync(shots, { recursive: true });
const STEP_MS = 2800;

const showcase = (page: Page) => page.locator('.showcase').first();
const panel = (page: Page) => showcase(page).locator('.sc-panel[data-on="true"]');
const step = (page: Page) => panel(page).locator('.sc-step button').evaluateAll((b) => b.findIndex((x) => x.getAttribute('aria-current') === 'step'));
const scrollTo = (page: Page, y: number) => page.evaluate((top) => window.scrollTo(0, top), y);
async function bringIntoView(page: Page) {
  await showcase(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));
  await page.waitForTimeout(300);
}
const shot = async (page: Page, name: string) => {
  await bringIntoView(page);
  await showcase(page).screenshot({ path: join(shots, `${test.info().project.name}-${name}.png`) });
};

for (const lang of ['en', 'fr', 'ar'] as const) {
  test(`tabs and steps keep one height, nothing overflows (${lang})`, async ({ page }) => {
    const d = dukanDemo[lang];
    for (const id of ['home', 'dukanErp'] as const) {
      await page.goto(pathOf(id, lang));
      await bringIntoView(page);
      const tabs = showcase(page).locator('[role="tab"]');
      await expect(tabs).toHaveText([d.electronics.tab, d.agent.tab]);
      const boxes = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [Math.round(r.width), Math.round(r.height)]));
      expect(boxes[0], 'two tabs of one size').toEqual(boxes[1]);
      expect(boxes[0]![1], 'a comfortable touch target').toBeGreaterThanOrEqual(44);
      const heights = new Set<number>();
      for (const t of [0, 1]) {
        await tabs.nth(t).click();
        await expect(tabs.nth(t)).toHaveAttribute('aria-selected', 'true');
        const ways = t === 1 ? [0, 1] : [null];
        for (const way of ways) {
          if (way !== null) await panel(page).locator('.sc-direction-choice').nth(way).click();
          for (let s = 0; s < 3; s++) {
            await panel(page).locator('.sc-step button').nth(s).click();
            await expect(panel(page).locator('.sc-step button').nth(s)).toHaveAttribute('aria-current', 'step');
            heights.add(Math.round((await showcase(page).boundingBox())!.height));
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
            if (id === 'dukanErp' && (lang === 'en' || s === 2)) await shot(page, `${lang}-${t ? 'agent' : 'electronics'}${way === 1 ? '-give-cash' : ''}-step${s + 1}`);
          }
        }
      }
      expect([...heights], `one height on ${id}`).toHaveLength(1);
    }
  });
}

test('scrolling: cards appear as they are reached, once; nothing stays hidden', async ({ page }) => {
  await page.goto(pathOf('dukanErp', 'en'));
  await page.waitForTimeout(300);
  const state = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-reveal]')].map((e) => ({
        top: e.getBoundingClientRect().top + window.scrollY,
        in: e.classList.contains('in'),
        opacity: getComputedStyle(e).opacity,
      })),
    );
  const vh = await page.evaluate(() => window.innerHeight);
  const atLoad = await state();
  expect(atLoad.filter((c) => c.top >= vh).every((c) => !c.in && c.opacity === '0'), 'below the fold, waiting').toBe(true);
  expect(atLoad.filter((c) => c.top < vh).every((c) => c.in && c.opacity === '1'), 'on screen at load, shown at once').toBe(true);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += Math.round(vh * 0.6)) {
    await scrollTo(page, y);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1200);
  const after = await state();
  expect(after.filter((c) => !c.in || c.opacity !== '1'), 'every card shown after scrolling through').toEqual([]);
  await scrollTo(page, 0);
  await page.waitForTimeout(400);
  expect((await state()).every((c) => c.in && c.opacity === '1'), 'once: still shown after scrolling back').toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('playback: only when asked, about 2.8 s a step, stops on the result; Pause holds; off screen pauses', async ({ page }) => {
  const d = dukanDemo.en;
  await page.goto(pathOf('dukanErp', 'en'));
  await bringIntoView(page);
  const play = panel(page).locator('.sc-play');
  await page.waitForTimeout(3200);
  expect(await step(page), 'nothing starts by itself').toBe(0);
  const started = Date.now();
  await play.click();
  await expect(play).toHaveText(d.pause);
  await expect.poll(() => step(page), { timeout: 5000, intervals: [50] }).toBe(1);
  const first = Date.now() - started;
  await expect.poll(() => step(page), { timeout: 5000, intervals: [50] }).toBe(2);
  const second = Date.now() - started - first;
  for (const ms of [first, second]) expect(ms > 2300 && ms < 3800, `a step lasted ${ms} ms (target ${STEP_MS})`).toBe(true);
  await expect(play).toHaveText(d.replay);
  await page.waitForTimeout(3200);
  expect(await step(page), 'stops on the result').toBe(2);
  // Replay, then Pause holds it.
  await play.click();
  expect(await step(page)).toBe(0);
  await page.waitForTimeout(1000);
  await play.click();
  await expect(play).toHaveText(d.play);
  await page.waitForTimeout(3500);
  expect(await step(page), 'Pause holds').toBe(0);
  // Playing, then scrolled out of sight: it pauses and does not start again on return.
  await play.click();
  await scrollTo(page, 0);
  await page.waitForTimeout(3600);
  await bringIntoView(page);
  await expect(play).toHaveText(d.play);
  expect(await step(page), 'paused off screen').toBe(0);
  // Switching activity stops it and starts the walkthrough again.
  await play.click();
  await showcase(page).locator('[role="tab"]').nth(1).click();
  expect(await step(page)).toBe(0);
  await expect(panel(page).locator('.sc-play')).toHaveText(d.play);
});

test('reduced motion: at load every card at rest and no Play; switched on live, playback stops', async ({ browser }, info) => {
  const use = info.project.use;
  const reduced = await browser.newContext({ ...use, reducedMotion: 'reduce' });
  const page = await reduced.newPage();
  await page.goto(pathOf('dukanErp', 'en'));
  await page.waitForTimeout(400);
  const motion = () =>
    page.evaluate(() => ({
      hidden: [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter((c) => getComputedStyle(c).opacity !== '1' || getComputedStyle(c).transform !== 'none').length,
      play: getComputedStyle(document.querySelector('.sc-play')!).display,
    }));
  expect(await motion()).toEqual({ hidden: 0, play: 'none' });
  await page.screenshot({ path: join(shots, `${info.project.name}-reduced-motion-at-load.png`), fullPage: true });
  await panel(page).locator('.sc-step button').nth(2).click();
  await expect(panel(page).locator('.sc-frame[data-on="true"]')).toContainText(dukanDemo.en.electronics.recorded);
  await reduced.close();

  const open = await browser.newContext({ ...use });
  const live = await open.newPage();
  await live.goto(pathOf('dukanErp', 'en'));
  await live.locator('.showcase').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));
  await live.locator('.showcase .sc-panel[data-on="true"] .sc-play').click();
  await live.emulateMedia({ reducedMotion: 'reduce' });
  await live.waitForTimeout(3500);
  const after = await live.evaluate(() => ({
    play: getComputedStyle(document.querySelector('.sc-play')!).display,
    hidden: [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter((c) => getComputedStyle(c).opacity !== '1').length,
    step: [...document.querySelectorAll('.sc-panel[data-on="true"] .sc-step button')].findIndex((b) => b.getAttribute('aria-current') === 'step'),
  }));
  expect(after).toEqual({ play: 'none', hidden: 0, step: 0 });
  await open.close();
});

test('screens for review: French on a phone, Arabic RTL, dark mode', async ({ browser }, info) => {
  for (const [lang, scheme] of [
    ['fr', 'light'],
    ['ar', 'light'],
    ['en', 'dark'],
    ['ar', 'dark'],
  ] as const) {
    const ctx = await browser.newContext({ ...info.project.use, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(pathOf('home', lang));
    await showcase(page).locator('[role="tab"]').nth(1).click();
    await panel(page).locator('.sc-step button').nth(1).click();
    await shot(page, `home-${lang}-${scheme}-agent-step2`);
    if (lang === 'ar') expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
    await ctx.close();
  }
});
