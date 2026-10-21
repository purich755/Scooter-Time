/* Тарифы: «Сколько у вас времени?» — пин-сцена со спидометром часов аренды.
   Скролл шагает стрелкой по 5 делениям; стрелку можно схватить и повернуть, деления кликабельны,
   ←/→ с клавиатуры. Ручной выбор докручивает пин, чтобы скролл и стрелка не спорили. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const C = window.ST_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const POS = [0.1, 0.3, 0.5, 0.7, 0.9];
  const HOURS = ['1 ЧАС', '2 ЧАСА', '3 ЧАСА', '4 ЧАСА', 'НОЧЬ · 22:00–10:00'];
  const rub = (n) => { const r = n % 100, d = n % 10; return r > 10 && r < 20 ? 'рублей' : d === 1 ? 'рубль' : d > 1 && d < 5 ? 'рубля' : 'рублей'; };

  ST.tariffs = {
    init() {
      const sec = $('#tariffs');
      const host = $('[data-tf-gauge]', sec);
      if (!host) return;
      const T = C.tariffs;
      const g = new ST.Gauge(host, {
        arc: [-120, 120], ticks: 50, major: 5,
        labels: T.map((t, i) => ({ f: POS[i], t: t.label })), labelR: 122, labelSize: 27,
        zones: [{ f0: 0.8, f1: 1 }], odometer: 17, odoTop: 0.66, captions: [{ t: 'ВРЕМЯ АРЕНДЫ', y: 150 }],
      });
      // кликабельные деления
      const NS = 'http://www.w3.org/2000/svg';
      POS.forEach((f, i) => {
        const a = ((g.ang(f) - 90) * Math.PI) / 180;
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', (200 + 122 * Math.cos(a)).toFixed(1));
        c.setAttribute('cy', (200 + 122 * Math.sin(a)).toFixed(1));
        c.setAttribute('r', 30);
        c.setAttribute('class', 'g-hit');
        c.addEventListener('click', () => goTo(i));
        g.svg.appendChild(c);
      });

      // фоны — декорация за прибором: грузим, только когда секция в экране от нас (не в пути первого экрана)
      const loadBgs = () => {
        for (const s of $$('[data-srcset]', sec)) { s.srcset = s.dataset.srcset; s.removeAttribute('data-srcset'); }
        for (const im of $$('img[data-src]', sec)) { im.src = im.dataset.src; im.removeAttribute('data-src'); }
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { loadBgs(); io.disconnect(); } }, { rootMargin: '100% 0px' });
        io.observe(sec);
      } else loadBgs();

      const price = (i) => (T[i].price ? ST.money(T[i].price) : 'ПО ДОГОВОРЁННОСТИ');
      const moodEl = $('[data-tf-mood]', sec), hoursEl = $('[data-tf-hours]', sec), priceEl = $('[data-tf-price]', sec);
      const bgs = $$('[data-bg]', sec), marks = $$('.tf-scale li', sec), chips = $$('[data-tf]', sec);
      let cur = -1, st = null, userUntil = 0;

      function set(i, src) {
        i = Math.max(0, Math.min(4, i));
        if (i === cur) return;
        const first = cur === -1;
        cur = i;
        const instant = first || ST.reduced || !window.gsap;
        g.setFraction(POS[i], { instant, vars: { duration: 0.75, ease: 'back.out(1.7)' } });
        g.setOdometer(price(i), { instant });
        g.labelEls.forEach((l, k) => l.classList.toggle('is-on', k === i));
        bgs.forEach((b, k) => b.classList.toggle('is-on', k === i));
        marks.forEach((m, k) => { m.classList.toggle('is-on', k === i); m.classList.toggle('is-past', k < i); });
        chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
        const p = T[i].price;
        host.setAttribute('aria-valuenow', i);
        host.setAttribute('aria-valuetext', p ? `${T[i].speech}, ${String(p).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${rub(p)}` : `${T[i].speech}, по договорённости`);
        hoursEl.textContent = HOURS[i];
        priceEl.innerHTML = p ? ST.money(p) : 'по&nbsp;договорённости';
        if (instant) { moodEl.textContent = T[i].mood; return; }
        gsap.timeline()
          .to(moodEl, { yPercent: -110, duration: 0.22, ease: 'power2.in', overwrite: true })
          .add(() => { moodEl.textContent = T[i].mood; })
          .fromTo(moodEl, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
      }

      function goTo(i) {
        i = Math.max(0, Math.min(4, i));
        userUntil = performance.now() + 1100;
        set(i, 'user');
        if (st) {
          const y = st.start + ((i + 0.5) / 5) * (st.end - st.start);
          ST.scrollTo(y, { duration: 0.9 });
        }
      }

      set(0, 'init');

      /* клавиатура */
      host.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); goTo(cur + 1); }
        else if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); goTo(cur - 1); }
        else if (k === 'Home') { e.preventDefault(); goTo(0); }
        else if (k === 'End') { e.preventDefault(); goTo(4); }
      });
      chips.forEach((c, k) => c.addEventListener('click', () => goTo(k)));

      /* стрелку можно схватить: угол через atan2, привязка к ближайшему делению; горизонтальный свайп — шаг */
      let drag = null;
      const nearest = (clientX, clientY) => {
        const r = host.getBoundingClientRect();
        const dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
        const a = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 — вверх, по часовой
        const f = (a + 120) / 240;
        let best = 0, bd = 9;
        POS.forEach((p, k) => { const d = Math.abs(p - f); if (d < bd) { bd = d; best = k; } });
        return best;
      };
      host.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        drag = { x: e.clientX, y: e.clientY, i0: cur, moved: false };
        host.classList.add('is-drag');
      });
      addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dist = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
        if (dist < 8 && !drag.moved) return;
        drag.moved = true;
        // в верхней половине прибора крутим стрелку по углу
        const r = host.getBoundingClientRect();
        if (drag.y < r.top + r.height * 0.62) { const i = nearest(e.clientX, e.clientY); if (i !== cur) goTo(i); }
      });
      const end = (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (cur === drag.i0 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(cur + (dx < 0 ? 1 : -1));
        drag = null;
        host.classList.remove('is-drag');
      };
      addEventListener('pointerup', end);
      addEventListener('pointercancel', () => { drag = null; host.classList.remove('is-drag'); });

      /* пин — только на широких экранах и без reduced-motion */
      if (!window.gsap || !window.ScrollTrigger) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        sec.classList.add('is-pinned');
        st = ScrollTrigger.create({
          trigger: sec, start: 'top top', end: '+=250%', pin: true, anticipatePin: 1,
          onUpdate: (self) => { if (performance.now() > userUntil) set(Math.min(4, Math.floor(self.progress * 5)), 'scroll'); },
        });
        return () => { sec.classList.remove('is-pinned'); st = null; };
      });
    },
  };
})();
