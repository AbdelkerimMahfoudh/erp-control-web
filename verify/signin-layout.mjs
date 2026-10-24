// Diagnostic only (never fails the run): the sign-in page's horizontal overflow at 320 px in EN/FR/AR, and what sticks
// out — for the app under test and, when BASELINE_APP is served, for the build before this phase, to tell a regression
// from an older defect.
import { BROWSER, engine, phoneContext } from './lib.mjs';
const targets = [['under test', process.env.APP ?? 'http://127.0.0.1:4320']];
if (process.env.BASELINE_APP) targets.push(['before (da5c73c)', process.env.BASELINE_APP]);
const browser = await engine.launch();
for (const [label, base] of targets) {
  for (const lang of ['en', 'fr', 'ar']) {
    const context = await phoneContext(browser, { lang, theme: 'light', width: 320 });
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.locator('input:visible').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({
      over: document.documentElement.scrollWidth - window.innerWidth,
      wide: [...document.querySelectorAll('body *')]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && ![...e.children].some((c) => c.getBoundingClientRect().right > window.innerWidth + 1))
        .slice(0, 5).map((e) => `${e.tagName.toLowerCase()} w${Math.round(e.getBoundingClientRect().width)} r${Math.round(e.getBoundingClientRect().right)} "${(e.textContent || '').trim().slice(0, 50)}"`),
    }));
    console.log(`[${BROWSER}] ${label} ${lang}/320: overflow ${r.over}px ${r.wide.join(' | ')}`);
    await context.close();
  }
}
await browser.close();
