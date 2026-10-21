/* Открытки из Казани (услуги) и сертификат-билет.
   Десктоп: веер, открытки разлетаются из стопки, штемпель припечатывается, 3D-наклон за курсором.
   Телефон: колода — верхнюю смахиваешь, следующая поднимается.
   Сертификат: выезжает из щели кассы, фольга-блик бежит за курсором. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function fan(deck, cards) {
    const G = !!window.gsap;
    if (!G || ST.reduced) return;
    // появление: из стопки по центру — в свои места
    const dr = deck.getBoundingClientRect();
    const tl = gsap.timeline({ paused: true });
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const dx = dr.left + dr.width / 2 - (r.left + r.width / 2), dy = 140;
      tl.from(c, { x: dx, y: dy, rotation: (i % 2 ? 6 : -6), opacity: 0, duration: 1.1, ease: 'power4.out' }, i * 0.12);
      const mark = $('.pc-mark', c);
      tl.from(mark, { scale: 1.4, opacity: 0, duration: 0.35, ease: 'power3.in', transformOrigin: '50% 50%' }, 0.55 + i * 0.12)
        .to(mark, { x: '+=2', y: '-=1', duration: 0.04, repeat: 3, yoyo: true, ease: 'none' }, 0.9 + i * 0.12);
    });
    ST.onEnter(deck, () => tl.play(), '-25%');

    if (!ST.fine) return;
    cards.forEach((c) => {
      const inner = $('.pc-in', c);
      const base = parseFloat(getComputedStyle(c).rotate) || 0;
      const rx = gsap.quickTo(inner, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ry = gsap.quickTo(inner, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      c.addEventListener('pointerenter', () => {
        gsap.set(c, { zIndex: 10 });
        gsap.to(c, { rotation: -base, y: -14, scale: 1.03, duration: 0.6, ease: 'expo.out' });
      });
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
        ry(((e.clientX - r.left) / r.width - 0.5) * 16);
      });
      c.addEventListener('pointerleave', () => {
        rx(0); ry(0);
        gsap.to(c, { rotation: 0, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', onComplete: () => gsap.set(c, { zIndex: '' }) });
      });
    });
  }

  function stack(deck, cards) {
    // колода: порядок — массив индексов, первый сверху
    let order = cards.map((_, i) => i);
    const lay = (anim) => {
      order.forEach((ci, depth) => {
        const c = cards[ci];
        const v = { zIndex: 10 - depth, y: depth * 12, scale: 1 - depth * 0.04, rotation: depth === 0 ? 0 : (depth % 2 ? 3 : -3), x: 0, opacity: depth > 2 ? 0 : 1 };
        if (window.gsap && anim && !ST.reduced) gsap.to(c, Object.assign({ duration: 0.5, ease: 'power3.out' }, v));
        else if (window.gsap) gsap.set(c, v);
        else { c.style.zIndex = v.zIndex; c.style.transform = `translateY(${v.y}px) scale(${v.scale})`; }
        c.setAttribute('aria-hidden', depth === 0 ? 'false' : 'true');
        for (const a of $$('a', c)) a.tabIndex = depth === 0 ? 0 : -1;
      });
      const h = Math.max(...cards.map((c) => c.offsetHeight));
      deck.style.height = h + 40 + 'px';
    };
    const next = (dir = 1) => {
      const top = cards[order[0]];
      const done = () => { order.push(order.shift()); lay(true); };
      if (window.gsap && !ST.reduced) gsap.to(top, { x: dir * innerWidth * 0.9, rotation: dir * 18, opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: done });
      else done();
    };
    lay(false);
    addEventListener('resize', () => lay(false));
    $('[data-deck-next]').addEventListener('click', () => next(1));
    // свайп
    let s = null;
    deck.addEventListener('pointerdown', (e) => { if (e.target.closest('a')) return; s = { x: e.clientX, y: e.clientY, c: cards[order[0]] }; });
    deck.addEventListener('pointermove', (e) => {
      if (!s || !window.gsap) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > Math.abs(e.clientY - s.y)) gsap.set(s.c, { x: dx, rotation: dx / 20 });
    });
    const up = (e) => {
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 70) next(dx > 0 ? 1 : -1); else if (window.gsap) gsap.to(s.c, { x: 0, rotation: 0, duration: 0.4, ease: 'back.out(2)' });
      s = null;
    };
    deck.addEventListener('pointerup', up);
    deck.addEventListener('pointercancel', up);
  }

  function ticket() {
    const t = $('[data-ticket]');
    if (!t) return;
    const foil = $('.ticket-foil', t);
    if (window.gsap && !ST.reduced) {
      gsap.set(t, { yPercent: -102 });
      ST.onEnter($('.till'), () => gsap.to(t, { yPercent: 0, duration: 1.4, ease: 'power3.out' }), '-28%');
    }
    if (!ST.fine || !window.gsap || ST.reduced) return;
    const rx = gsap.quickTo(t, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(t, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      foil.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      foil.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      foil.style.setProperty('--ang', ((x + y) * 180).toFixed(0));
      rx(-(y - 0.5) * 20); ry((x - 0.5) * 20);
    });
    t.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  ST.postcards = {
    init() {
      const deck = $('[data-deck]');
      if (deck) {
        const cards = $$('.pc', deck);
        const mq = matchMedia('(min-width: 1024px)');
        if (mq.matches) fan(deck, cards); else stack(deck, cards);
      }
      ticket();
    },
  };
})();
