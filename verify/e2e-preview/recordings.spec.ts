import { test, type Page } from '@playwright/test';
import { pathOf } from '../src/site/routes';

/**
 * Two recordings in WebKit under the same profiles as webkit.spec.ts, for the owner's review: the illustration played
 * through both walkthroughs, and the cards entering while the page scrolls. Browser automation, not an iPhone.
 */
test.use({ video: 'on' });

const STEP_MS = 2800;
const showcase = (page: Page) => page.locator('.showcase').first();
const panel = (page: Page) => showcase(page).locator('.sc-panel[data-on="true"]');
const scrollTo = (page: Page, y: number) => page.evaluate((top) => window.scrollTo(0, top), y);
async function bringIntoView(page: Page) {
  await showcase(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));
  await page.waitForTimeout(300);
}

test('electronics then agent walkthrough, played', async ({ page }) => {
  await page.goto(pathOf('home', 'en'));
  await bringIntoView(page);
  await page.waitForTimeout(800);
  await panel(page).locator('.sc-play').click();
  await page.waitForTimeout(STEP_MS * 2 + 1200);
  await showcase(page).locator('[role="tab"]').nth(1).click();
  await page.waitForTimeout(600);
  await panel(page).locator('.sc-play').click();
  await page.waitForTimeout(STEP_MS * 2 + 1200);
});
test('cards entering while scrolling', async ({ page }) => {
  await page.goto(pathOf('dukanErp', 'en'));
  await page.waitForTimeout(800);
  const vh = await page.evaluate(() => window.innerHeight);
  for (let i = 1; i <= 8; i++) {
    await scrollTo(page, Math.round(vh * 0.45 * i));
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(800);
});
