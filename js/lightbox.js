/* Общий лайтбокс: группы по data-lb (garage, film). FLIP-раскрытие из миниатюры в кадр плёнки,
   счётчик «07 / 16», стрелки, свайп, ←/→, Esc и клик по фону, фокус-ловушка, Lenis на паузе,
   предзагрузка соседних кадров. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const webp = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; } })();
  const pad = (n) => String(n).padStart(2, '0');

  ST.lightbox = {
    init() {
      const lb = $('.lb');
      if (!lb) return;
      const img = $('.lb-img', lb), frame = $('.lb-frame', lb), bg = $('.lb-bg', lb);
      const count = $('.lb-count', lb), alt = $('.lb-alt', lb);
      let group = [], idx = 0, opener = null, open = false;
      const src = (t) => (webp ? t.dataset.full : t.dataset.fullJpg);
      const thumb = (t) => $('img', t);

      function show(i, dir) {
        idx = (i + group.length) % group.length;
        const t = group[idx];
        img.width = +t.dataset.w; img.height = +t.dataset.h;
        img.src = src(t);
        img.alt = thumb(t).alt;
        alt.textContent = thumb(t).alt;
        count.textContent = `${pad(idx + 1)} / ${pad(group.length)}`;
        for (const k of [1, -1]) { const n = group[(idx + k + group.length) % group.length]; if (n) new Image().src = src(n); }
        if (dir && window.gsap && !ST.reduced) gsap.fromTo(frame, { x: dir * 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
      }

      function openAt(trigger) {
        const name = trigger.dataset.lb;
        group = $$(`[data-lb="${name}"]`);
        opener = trigger;
        lb.hidden = false; open = true;
        show(group.indexOf(trigger));
        if (ST.lenis) ST.lenis.stop();
        document.body.style.overflow = 'hidden';
        $('.lb-close', lb).focus({ preventScroll: true });
        if (!window.gsap || ST.reduced) return;
        // FLIP: из прямоугольника миниатюры в финальный кадр
        const from = thumb(trigger).getBoundingClientRect();
        const run = () => {
          const to = frame.getBoundingClientRect();
          gsap.fromTo(frame, {
            x: from.left + from.width / 2 - (to.left + to.width / 2), y: from.top + from.height / 2 - (to.top + to.height / 2),
            scale: Math.max(0.15, from.width / to.width), opacity: 0.6,
          }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' });
          gsap.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        };
        if (img.complete && img.naturalWidth) run(); else { gsap.set(frame, { opacity: 0 }); img.decode ? img.decode().then(run, run) : (img.onload = run); }
      }

      function close() {
        if (!open) return;
        open = false;
        const done = () => {
          lb.hidden = true; if (window.gsap) gsap.set(frame, { clearProps: 'all' });
          if (ST.lenis) ST.lenis.start();
          document.body.style.overflow = '';
          if (opener) opener.focus({ preventScroll: true });
        };
        if (!window.gsap || ST.reduced) return done();
        const t = opener && thumb(opener).getBoundingClientRect();
        const to = frame.getBoundingClientRect();
        const vis = t && t.bottom > 0 && t.top < innerHeight && t.right > 0 && t.left < innerWidth;
        gsap.to(bg, { opacity: 0, duration: 0.35 });
        if (vis) gsap.to(frame, { x: t.left + t.width / 2 - (to.left + to.width / 2), y: t.top + t.height / 2 - (to.top + to.height / 2), scale: t.width / to.width, opacity: 0, duration: 0.45, ease: 'power3.in', onComplete: done });
        else gsap.to(frame, { opacity: 0, scale: 0.94, duration: 0.3, onComplete: done });
      }

      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-lb]');
        if (t && !open) { e.preventDefault(); openAt(t); }
      });
      let swiped = false;
      $$('[data-lb-close]', lb).forEach((b) => b.addEventListener('click', () => { if (swiped) { swiped = false; return; } close(); }));
      $('.lb-prev', lb).addEventListener('click', () => show(idx - 1, -1));
      $('.lb-next', lb).addEventListener('click', () => show(idx + 1, 1));
      lb.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1, 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1, -1); }
        else if (e.key === 'Tab') {
          const f = $$('button', lb).filter((b) => b.offsetParent !== null);
          const i = f.indexOf(document.activeElement);
          e.preventDefault();
          f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
      });
      // свайп
      let sx = null, sy = null;
      lb.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
      lb.addEventListener('pointerup', (e) => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { swiped = true; setTimeout(() => (swiped = false), 400); show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
        sx = null;
      });
    },
  };
})();
