// Проверка интерактивов реальными событиями мыши и клавиатуры.
//   node tools/interact.mjs [1440|375]
import { chromium } from 'playwright-core';
import os from 'node:os'; import path from 'node:path';
const W = +(process.argv[2] || 1440), H = W < 700 ? 812 : 900, mobile = W < 700;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'st-int-' + W), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: mobile, hasTouch: mobile, locale: 'ru-RU',
});
const page = ctx.pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => { try { sessionStorage.setItem('st-pre', '1'); } catch (e) {} });
await page.goto('http://localhost:8216/', { waitUntil: 'load' });
await sleep(1200);
let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { if (cond) ok++; else bad++; console.log(cond ? '✓' : '✗', name, extra); };
const go = async (sel, off = 0) => { await page.evaluate(([s, o]) => { const el = typeof s === 'number' ? s : document.querySelector(s); ST.lenis ? ST.lenis.scrollTo(el, { immediate: true, force: true, offset: o }) : scrollTo(0, (typeof el === 'number' ? el : el.getBoundingClientRect().top + scrollY) + o); }, [sel, off]); await sleep(500); };
const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
const tap = async (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

/* 1. ключ в hero */
{
  await go(0);
  const b = await box('[data-hero-key]');
  await tap(b.cx, b.y + b.h * 0.25);
  await sleep(1300);
  const s = await page.evaluate(() => ({ p: document.querySelector('[data-hero-key]').getAttribute('aria-pressed'), lamp: +getComputedStyle(document.querySelector('.hero-lamp')).opacity, note: document.querySelector('.hero-key-note').textContent }));
  check('ключ: повернулся, фара горит', s.p === 'true' && s.lamp > 0.2 && s.note === 'заведено!', JSON.stringify(s));
  await tap(b.cx, b.y + b.h * 0.25); await sleep(700);
  check('ключ: повторный клик глушит', (await page.evaluate(() => document.querySelector('[data-hero-key]').getAttribute('aria-pressed'))) === 'false');
}

/* 2. тарифы */
{
  await go('#tariffs', mobile ? -40 : 0);
  if (!mobile) {
    await page.evaluate(() => { const st = ScrollTrigger.getAll().find((t) => t.pin); ST.lenis.scrollTo(st.start + 2, { immediate: true, force: true }); });
    await sleep(600);
  }
  await page.focus('[data-tf-gauge]');
  await page.keyboard.press('ArrowRight'); await sleep(1200);
  await page.keyboard.press('ArrowRight'); await sleep(1300);
  let s = await page.evaluate(() => ({ v: document.querySelector('[data-tf-gauge]').getAttribute('aria-valuenow'), t: document.querySelector('[data-tf-gauge]').getAttribute('aria-valuetext'), price: document.querySelector('[data-tf-price]').textContent, mood: document.querySelector('[data-tf-mood]').textContent }));
  check('тарифы: ←/→ с клавиатуры', s.v === '2' && /2 500/.test(s.price.replace(/ /g, ' ')) && s.mood === 'Прогулка и фотографии', JSON.stringify(s));
  // тащим стрелку к «НОЧЬ» (правее и выше центра)
  const g = await box('[data-tf-gauge]');
  const from = [g.cx, g.y + g.h * 0.2], to = [g.cx + g.w * 0.42, g.y + g.h * 0.42];
  if (mobile) {
    await page.locator('[data-tf="4"]').scrollIntoViewIfNeeded().catch(() => {});
    const c = await box('[data-tf="4"]');
    await tap(c.cx, c.cy); await sleep(1300);
  } else {
    await page.mouse.move(...from); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 12, from[1] + ((to[1] - from[1]) * i) / 12); await sleep(30); }
    await page.mouse.up(); await sleep(1600);
  }
  s = await page.evaluate(() => ({ v: document.querySelector('[data-tf-gauge]').getAttribute('aria-valuenow'), odo: Array.from(document.querySelectorAll('.tf-gauge .odo-c')).map((c) => c._ch).join('') }));
  check(mobile ? 'тарифы: кнопка «НОЧЬ»' : 'тарифы: стрелку можно схватить мышью', s.v === '4' && /ДОГОВОР/.test(s.odo), JSON.stringify(s));
}

/* 3. гараж */
{
  await go('.garage-view', -200);
  const v = await box('.garage-view');
  if (!mobile) {
    const x0 = await page.evaluate(() => gsap.getProperty('.garage-track', 'x'));
    await page.mouse.move(v.x + v.w * 0.7, v.cy); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(v.x + v.w * 0.7 - i * 45, v.cy); await sleep(16); }
    await page.mouse.up(); await sleep(1500);
    const x1 = await page.evaluate(() => gsap.getProperty('.garage-track', 'x'));
    check('гараж: лента тянется мышью', x1 < x0 - 200, `${x0} → ${x1}`);
    const lbOpen = await page.evaluate(() => !document.querySelector('.lb').hidden);
    check('гараж: после перетаскивания лайтбокс не открылся', !lbOpen);
    // наведение на ключ
    const k = await page.evaluate(() => { const els = Array.from(document.querySelectorAll('[data-key]')); const e = els.find((el) => { const r = el.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth; }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.2 }; });
    await page.mouse.move(k.x, k.y); await sleep(900);
    check('гараж: наведение поворачивает ключ', await page.evaluate(() => document.querySelectorAll('.car.is-on').length === 1));
  } else {
    await page.evaluate(() => document.querySelector('.garage-view').scrollBy({ left: 300 })); await sleep(600);
    check('гараж: лента листается пальцем (нативно)', (await page.evaluate(() => document.querySelector('.garage-view').scrollLeft)) > 100);
    const k = await page.evaluate(() => { const e = Array.from(document.querySelectorAll('[data-key]')).find((el) => { const r = el.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth; }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.2 }; });
    await sleep(400);
    await tap(k.x, k.y); await sleep(900);
    check('гараж: тап поворачивает ключ', await page.evaluate(() => document.querySelectorAll('.car.is-on').length === 1));
  }
}

/* 4. лайтбокс из плёнки */
{
  await go('.strip--a', -160);
  await sleep(800);
  const f = await page.evaluate(() => { const all = Array.from(document.querySelectorAll('.fr-btn')); const b = all.find((el) => { const r = el.getBoundingClientRect(); return r.left > 4 && r.right < innerWidth - 4 && r.top > 60 && r.bottom < innerHeight - 90; }); if (!b) return { dbg: all.slice(0, 6).map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }), ih: innerHeight, iw: innerWidth }; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (f.dbg) console.log('кадры:', JSON.stringify(f));
  await tap(f.x, f.y); await sleep(900);
  let s = await page.evaluate(() => ({ open: !document.querySelector('.lb').hidden, count: document.querySelector('.lb-count').textContent, focus: document.activeElement.className, img: document.querySelector('.lb-img').naturalWidth }));
  check('лайтбокс: открылся с кадром и счётчиком', s.open && / \/ 16$/.test(s.count) && s.img > 0, JSON.stringify(s));
  const c0 = s.count;
  await page.keyboard.press('ArrowRight'); await sleep(600);
  s = await page.evaluate(() => document.querySelector('.lb-count').textContent);
  check('лайтбокс: → листает', s !== c0, `${c0} → ${s}`);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  check('лайтбокс: фокус не уходит наружу', await page.evaluate(() => !!document.activeElement.closest('.lb')));
  await page.keyboard.press('Escape'); await sleep(700);
  check('лайтбокс: Esc закрывает', await page.evaluate(() => document.querySelector('.lb').hidden));
}

/* 5. радио */
{
  await go('.radio-sec', 60); await sleep(2400);
  const st = await box('[data-station="1"]');
  await tap(st.cx, st.cy); await sleep(1800);
  const s = await page.evaluate(() => ({ name: document.querySelector('[data-air-name]').textContent, text: document.querySelector('[data-air-text]').textContent, tuned: document.querySelector('[data-radio]').classList.contains('is-tuned') }));
  check('радио: станция DAVID настраивается', s.name === 'DAVID' && s.tuned && /незабываемые/.test(s.text), JSON.stringify(s));
  if (!mobile) {
    const k = await box('[data-knob]');
    await page.mouse.move(k.cx + k.w * 0.4, k.cy); await page.mouse.down();
    for (let a = 0; a <= 90; a += 10) { const r = (a * Math.PI) / 180; await page.mouse.move(k.cx + Math.cos(r) * k.w * 0.4, k.cy + Math.sin(r) * k.w * 0.4); await sleep(20); }
    await page.mouse.up(); await sleep(1500);
    const n = await page.evaluate(() => document.querySelector('[data-air-name]').textContent);
    check('радио: ручку можно крутить', n === 'ГОСТЬ', n);
  }
}

/* 6. меню и колода на телефоне */
if (mobile) {
  await go('[data-deck-next]', -500);
  const before = await page.evaluate(() => Array.from(document.querySelectorAll('.pc')).find((c) => c.getAttribute('aria-hidden') === 'false').dataset.pc);
  const nb = await box('[data-deck-next]');
  await tap(nb.cx, nb.cy); await sleep(1100);
  const after = await page.evaluate(() => Array.from(document.querySelectorAll('.pc')).find((c) => c.getAttribute('aria-hidden') === 'false').dataset.pc);
  check('колода: следующая открытка', before !== after, `${before} → ${after}`);
  await go(0);
  const bb = await box('.burger');
  await tap(bb.cx, bb.cy); await sleep(700);
  check('меню: открывается', await page.evaluate(() => !document.querySelector('#mmenu').hidden));
  const l = await page.evaluate(() => { const r = document.querySelector('.mmenu-nav a[href="#find"]').getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; });
  await tap(l.x, l.y); await sleep(2200);
  const s = await page.evaluate(() => ({ hidden: document.querySelector('#mmenu').hidden, top: Math.round(document.querySelector('#find').getBoundingClientRect().top) }));
  check('меню: пункт закрывает меню и ведёт к секции', s.hidden && Math.abs(s.top) < 120, JSON.stringify(s));
}

/* 7. разметка */
{
  const s = await page.evaluate(() => ({
    noAlt: Array.from(document.images).filter((i) => !i.hasAttribute('alt')).length,
    dupIds: (() => { const m = {}; for (const e of document.querySelectorAll('[id]')) m[e.id] = (m[e.id] || 0) + 1; return Object.entries(m).filter(([, n]) => n > 1).map(([k]) => k); })(),
    unnamedBtns: Array.from(document.querySelectorAll('button, a[href]')).filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim())).map((b) => b.outerHTML.slice(0, 80)),
    tel: document.querySelectorAll('a[href="tel:+78432165290"]').length,
    forms: document.querySelectorAll('form, input, textarea, select').length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('разметка: alt у всех картинок', s.noAlt === 0, s.noAlt);
  check('разметка: id без дублей', s.dupIds.length === 0, s.dupIds.join(','));
  check('разметка: у кнопок и ссылок есть имя', s.unnamedBtns.length === 0, s.unnamedBtns.join(' | '));
  check('разметка: нет форм и полей', s.forms === 0);
  check('разметка: нет горизонтального скролла', s.overflow <= 0, s.overflow);
}
check('консоль без ошибок', errors.length === 0, errors.join(' | '));
console.log(`\n${ok} ✓  ${bad} ✗`);
await ctx.close();
