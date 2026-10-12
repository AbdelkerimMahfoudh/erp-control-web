// Contact sheets of the browser screenshots (docs/74 §9): one image per variant folder, every page as a labelled
// thumbnail, plus an index of every screenshot. Uses Playwright's Chromium (CI only).
//
//   node scripts/contact-sheets.mjs <evidence-dir>
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ev = process.argv[2] ?? 'e2e-output';
const root = join(ev, 'screenshots');
if (!existsSync(root)) throw new Error(`no screenshots under ${root}`);
const variants = readdirSync(root).sort();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const index = ['# Screenshot index', '', `Generated ${new Date().toISOString()} from the CI run; JPEG, full page unless noted.`, ''];
for (const variant of variants) {
  const files = readdirSync(join(root, variant)).filter((f) => f.endsWith('.jpg')).sort();
  index.push(`## ${variant} (${files.length})`, '', ...files.map((f) => `- screenshots/${variant}/${f}`), '');
  const tiles = files
    .map((f) => {
      const data = readFileSync(join(root, variant, f)).toString('base64');
      return `<figure><div class="frame"><img src="data:image/jpeg;base64,${data}"></div><figcaption>${f}</figcaption></figure>`;
    })
    .join('');
  await page.setContent(
    `<!doctype html><html><head><style>
      body{margin:16px;font:13px system-ui,sans-serif;background:#f3f4f8;color:#172033}
      h1{font-size:18px;margin:0 0 12px}
      .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
      figure{margin:0;background:#fff;border:1px solid #dcdfea;border-radius:8px;padding:6px}
      .frame{height:420px;overflow:hidden;border-radius:4px}
      img{width:100%;display:block}
      figcaption{margin-top:4px;word-break:break-all}
    </style></head><body><h1>Contact sheet — ${variant} — ${files.length} pages</h1><div class="grid">${tiles}</div></body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: join(ev, `contact-sheet-${variant}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
  console.log(`contact sheet ${variant}: ${files.length} pages`);
}
writeFileSync(join(ev, 'SCREENSHOT_INDEX.md'), `${index.join('\n')}\n`);
await browser.close();
