// Стоимость полной раскладки страницы (display:none → block) и вклад каждой секции (CPU ×4, без скриптов).
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, deviceScaleFactor: 1.75 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await p.route(/\/js\//, (r) => r.abort());
await p.goto('http://localhost:8216/', { waitUntil: 'load' });
await p.waitForTimeout(800);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const res = await p.evaluate(() => {
  const full = () => { document.body.style.display = 'none'; document.body.offsetHeight; const t = performance.now(); document.body.style.display = ''; document.body.offsetHeight; return performance.now() - t; };
  const med = (f) => [f(), f(), f()].sort((a, b) => a - b)[1];
  const all = med(full);
  const out = [['ВСЯ СТРАНИЦА', all.toFixed(0)]];
  for (const s of [...document.querySelectorAll('main > section, footer, .grain, .lb, .sprite')]) {
    const d = s.style.display; s.style.display = 'none';
    const c = med(full);
    s.style.display = d;
    out.push([(s.className.baseVal ?? s.className).split(' ')[0] || s.tagName, (all - c).toFixed(0)]);
  }
  return out;
});
console.log(res.map((r) => r.join(': ')).join('\n'));
await b.close();
