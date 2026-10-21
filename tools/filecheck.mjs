// Открывается ли страница с диска (file://): шрифты, ошибки консоли.
import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage();
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(pathToFileURL(path.resolve('index.html')).href);
await p.waitForTimeout(2500);
console.log(await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.style).join(', '); }));
console.log('ошибки:', errs.length ? errs.join('\n') : 'нет');
await b.close();
