// Длинные задачи при загрузке с замедлением CPU ×4 и что их вызывает (refresh ScrollTrigger и др.).
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration), 'render ' + Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0) + ' | ' + (e.scripts || []).map((s) => (s.sourceURL || '').split('/').pop() + ' dur ' + Math.round(s.duration) + ' forcedLayout ' + Math.round(s.forcedStyleAndLayoutDuration)).join(' ; ')]); }).observe({ type: 'long-animation-frame', buffered: true });
  const t0 = performance.now();
  const hook = setInterval(() => {
    if (window.ScrollTrigger && !ScrollTrigger.__h) {
      ScrollTrigger.__h = 1; const r = ScrollTrigger.refresh.bind(ScrollTrigger);
      ScrollTrigger.refresh = (...a) => { const s = performance.now(); r(...a); window.__lt.push(['refresh', Math.round(s), Math.round(performance.now() - s), new Error().stack.split('\n').slice(2, 4).join(' | ')]); };
      clearInterval(hook);
    }
  }, 1);
});
await p.goto('http://localhost:8216/', { waitUntil: 'load' });
await p.waitForTimeout(4000);
console.log((await p.evaluate(() => window.__lt)).filter((x) => x[0] === 'refresh' || x[1] > 50).map((x) => x.join('  ')).join('\n'));
await b.close();
