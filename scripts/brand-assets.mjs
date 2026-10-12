// The social preview image and the PNG icons (docs/74 §5), rendered from text with the site's palette — no logo is
// approved, so these are the replaceable text treatment, not a new mark. Run in CI (Playwright's Chromium); the
// output is reviewed and copied into public/ by hand.
//
//   node scripts/brand-assets.mjs <out-dir>
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'brand-assets';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

const social = `<!doctype html><html><head><style>
  html,body{margin:0;width:1200px;height:630px}
  body{display:grid;align-content:center;gap:28px;padding:0 96px;box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
       background:linear-gradient(160deg,#ffffff 35%,#eef0fb);color:#172033}
  .org{display:flex;align-items:center;gap:18px;font-size:40px;font-weight:750;letter-spacing:-0.01em}
  .org i{width:64px;height:64px;border-radius:16px;background:#172033;color:#fff;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:36px}
  h1{margin:0;font-size:64px;line-height:1.1;max-width:900px;letter-spacing:-0.02em}
  .product{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:700;color:#3f35b8}
  .product i{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#5146d9,#7a52e0);color:#fff;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:28px}
</style></head><body>
  <div class="org"><i>T</i>TSX-MR</div>
  <h1>Practical digital tools for businesses</h1>
  <div class="product"><i>D</i>Dukan ERP</div>
</body></html>`;
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(social);
await page.screenshot({ path: join(out, 'og-default.png') });

for (const size of [180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;
    background:#172033;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:700;font-size:${Math.round(size * 0.5)}px">T</body></html>`);
  await page.screenshot({ path: join(out, size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`) });
}
await browser.close();
console.log(`brand assets written to ${out}`);
