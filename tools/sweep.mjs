// Сплошной проход по странице кадрами в экран + контактный лист + ошибки консоли.
//   node tools/sweep.mjs [ширина=1440] [--reduced] [--step 0.85] [--h 900]
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : d; };
const W = +(args.find((a) => /^\d+$/.test(a)) || 1440), H = +opt('h', W < 700 ? 812 : 900);
const reduced = args.includes('--reduced');
const STEP = +opt('step', 0.85);
const tag = `${W}${reduced ? 'r' : ''}`;
const out = `raw/sweep-${tag}`;
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'st-sweep-' + tag), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, deviceScaleFactor: 1,
  locale: 'ru-RU', reducedMotion: reduced ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0];
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
await page.addInitScript(() => { try { sessionStorage.setItem('st-pre', '1'); } catch (e) {} });
await page.goto('http://localhost:8216/', { waitUntil: 'load' });
await sleep(1800);
const go = (y) => page.evaluate((y) => { if (window.ST && ST.lenis) ST.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, y);
let y = 0, n = 0;
const files = [];
while (true) {
  await go(y); await sleep(+opt('wait', 900));
  const f = `${out}/${String(n).padStart(2, '0')}.png`;
  await page.screenshot({ path: f }); files.push(f);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const vw = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
  if (vw[1] > vw[0] + 1) errors.push(`горизонтальный скролл: scrollWidth ${vw[1]} > ${vw[0]} на y=${y}`);
  if (y >= total - H) break;
  y = Math.min(total - H, y + Math.round(H * STEP)); n++;
  if (n > 80) break;
}
// контактный лист
const tw = W < 700 ? 300 : 480, th = Math.round((tw * H) / W), cols = W < 700 ? 6 : 4;
const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(tw, th).toBuffer(), left: (i % cols) * (tw + 6), top: Math.floor(i / cols) * (th + 6) })));
const rows = Math.ceil(files.length / cols);
await sharp({ create: { width: cols * (tw + 6), height: rows * (th + 6), channels: 3, background: '#555' } }).composite(tiles).jpeg({ quality: 80 }).toFile(`raw/sweep-${tag}.jpg`);
console.log(`кадров ${files.length} → raw/sweep-${tag}.jpg`);
console.log(errors.length ? 'ошибки:\n' + [...new Set(errors)].join('\n') : 'ошибок нет');
await ctx.close();
