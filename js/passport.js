/* Техпаспорт поездки: строки бланка печатаются машинкой (~25 мс на знак, мигающая каретка),
   после последней строки припечатывается «ПРОВЕРЕНО». Полный текст всегда есть для скринридеров. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  ST.passport = {
    init() {
      const box = $('[data-passport]');
      if (!box || !window.gsap || ST.reduced) return;
      const rows = $$('[data-type]', box).map((dd) => {
        const full = dd.textContent;
        dd.innerHTML = '';
        const sr = document.createElement('span'); sr.className = 'visually-hidden'; sr.textContent = full;
        const tw = document.createElement('span'); tw.setAttribute('aria-hidden', 'true');
        dd.append(sr, tw);
        return { dd, tw, full };
      });
      const seal = $('.seal', box);
      gsap.set(seal, { opacity: 0, scale: 1.5, rotate: -30 });
      const type = (row) => new Promise((res) => {
        row.dd.classList.add('caret');
        let i = 0;
        const t = setInterval(() => {
          row.tw.textContent = row.full.slice(0, ++i);
          if (i >= row.full.length) { clearInterval(t); setTimeout(() => { row.dd.classList.remove('caret'); res(); }, 140); }
        }, 25);
      });
      ST.onEnter(box, async () => {
        for (const r of rows) await type(r);
        gsap.timeline()
          .to(seal, { opacity: 0.9, scale: 1, rotate: -14, duration: 0.32, ease: 'power4.in' })
          .to(box, { x: 2, y: 1, duration: 0.04, repeat: 3, yoyo: true, ease: 'none' })
          .set(box, { x: 0, y: 0 });
      }, '-35%');
    },
  };
})();
