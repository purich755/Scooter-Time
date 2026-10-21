// Страница без GSAP/Lenis (как если бы библиотеки не загрузились): ошибки, видимость блоков, скриншоты.
import { chromium } from 'playwright-core';
const W = +(process.argv[2] || 1440);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: W, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && !/vendor/.test(m.text()) && errs.push(m.text()));
await p.route(/\/js\/vendor\//, (r) => r.abort());
await p.goto('http://localhost:8216/', { waitUntil: 'load' });
await p.waitForTimeout(4000);
const s = await p.evaluate(() => {
  const hidden = [...document.querySelectorAll('main *')].filter((el) => { const cs = getComputedStyle(el); return el.offsetParent !== null && (+cs.opacity === 0) && el.textContent.trim().length > 3; }).map((el) => el.className || el.tagName).slice(0, 10);
  return { ready: document.documentElement.hasAttribute('data-ready'), pre: getComputedStyle(document.querySelector('.pre')).display, hidden, gauges: document.querySelectorAll('.gauge-svg').length };
});
console.log(JSON.stringify(s));
await p.evaluate(() => document.querySelector('#services').scrollIntoView());
await p.waitForTimeout(500);
await p.screenshot({ path: 'raw/novendor.png' });
console.log('ошибки:', errs.length ? errs.join(' | ') : 'нет');
await b.close();
