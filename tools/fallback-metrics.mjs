// Подбор size-adjust для системных фолбэков: ширина одной и той же строки в веб-шрифте и в фолбэке.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage();
await p.goto('http://localhost:8216/');
await p.waitForTimeout(2500);
const res = await p.evaluate(async () => {
  await document.fonts.ready;
  const text = 'Ретро-мопеды с полным баком, шлемом и характером. У каждого своё имя. От часа до целой ночи. ПРОКАТ РЕТРО-СКУТЕРОВ · КАЗАНЬ 750 М';
  const c = document.createElement('canvas').getContext('2d');
  const w = (f) => { c.font = f; return c.measureText(text).width; };
  const pairs = [
    ['Manrope', '400 100px Manrope', '400 100px Arial'],
    ['Cormorant', '500 100px "Cormorant Garamond"', '400 100px "Times New Roman"'],
    ['Cormorant italic', 'italic 500 100px "Cormorant Garamond"', 'italic 400 100px "Times New Roman"'],
    ['Alumni', '700 100px "Alumni Sans"', '700 100px Arial'],
    ['Alumni/narrow', '700 100px "Alumni Sans"', '700 100px "Arial Narrow"'],
  ];
  return pairs.map(([n, a, f]) => [n, (w(a) / w(f) * 100).toFixed(1) + '%']);
});
console.log(res);
await b.close();
