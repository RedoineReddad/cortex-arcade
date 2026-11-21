// Smoke test: opens each game, starts it, monkey-clicks for a few seconds and
// fails on any console error / page error.
//   node tests/smoke.mjs                 → all games, 4s of random input each
//   node tests/smoke.mjs chain-calc 20   → one game, 20s of random input
//   SHOTS=1 node tests/smoke.mjs         → also save screenshots to tests/shots/
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { GAMES } from '../js/games/catalog.js';

const [only, secsArg] = process.argv.slice(2);
const secs = Number(secsArg || 4);
const ids = only && only !== 'all' ? only.split(',') : GAMES.map((g) => g.id);
const server = await serve(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
if (process.env.SHOTS) fs.mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

let failures = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  try {
    await page.goto(base + '#/play/' + id);
    await page.click('.sheet .btn.primary');
    await page.waitForFunction(() => window.__cortex && !document.querySelector('.countdown'), null, { timeout: 8000 });
    await page.waitForTimeout(1200);
    if (process.env.SHOTS) await page.screenshot({ path: `tests/shots/${id}-a.png` });
    const t0 = Date.now();
    let ended = false;
    while (Date.now() - t0 < secs * 1000) {
      if (await page.$('.result')) { ended = true; break; }
      const r = Math.random();
      if (r < 0.15) await page.keyboard.press(String(Math.floor(Math.random() * 10)));
      else if (r < 0.2) await page.keyboard.press('Enter');
      else if (r < 0.25) await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][Math.floor(Math.random() * 4)]);
      else {
        const els = await page.$$('.stage button, .stage [data-hit], .stage canvas, .stage .tap');
        const el = els[Math.floor(Math.random() * els.length)];
        if (el) await el.click({ timeout: 500, force: true }).catch(() => {});
        else {
          const box = await page.$eval('.stage', (s) => { const b = s.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }).catch(() => null);
          if (box) await page.mouse.click(box.x + Math.random() * box.w, box.y + Math.random() * box.h);
        }
      }
      await page.waitForTimeout(120);
    }
    if (process.env.SHOTS) await page.screenshot({ path: `tests/shots/${id}-b.png` });
    const stageKids = await page.$eval('.stage', (s) => s.children.length).catch(() => (ended ? 1 : 0));
    if (!ended && stageKids === 0) errors.push('stage is empty');
    if (await page.$('.stage .error')) errors.push('error box: ' + (await page.textContent('.stage .error')));
    console.log(`${errors.length ? '✗' : '✓'} ${id}${ended ? ' (reached results)' : ''}`);
  } catch (e) {
    errors.push('exception: ' + e.message.split('\n')[0]);
    console.log(`✗ ${id}`);
  }
  errors.forEach((e) => console.log('   ' + e));
  failures += errors.length ? 1 : 0;
  await page.close();
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} game(s) failed` : '\nAll good');
process.exit(failures ? 1 : 0);
