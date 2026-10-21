/* The Scooter Time — сборка страницы: Lenis + ScrollTrigger, появления, шапка, курсор, мини-часы, прелоадер.
   Модули секций (hero, garage, tariffs…) лежат в своих файлах и вызываются отсюда по порядку:
   сначала пин тарифов, потом всё, что ниже и выше него. */
(function () {
  'use strict';
  const ST = window.ST;
  const C = window.ST_CONFIG;
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const G = !!(window.gsap && window.ScrollTrigger);
  ST.G = G;

  /* Одноразовые появления — на IntersectionObserver, а не на ScrollTrigger: они не участвуют
     в пересчётах раскладки при refresh. margin '-15%' ≈ «верх элемента прошёл 85% экрана». */
  const observers = {};
  ST.onEnter = (el, fn, margin = '-15%') => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return fn();
    const io = (observers[margin] ||= new IntersectionObserver((entries, obs) => {
      for (const e of entries) if (e.isIntersecting) { obs.unobserve(e.target); const f = e.target._enter; e.target._enter = null; f && f(); }
    }, { rootMargin: `0px 0px ${margin} 0px` }));
    el._enter = fn;
    io.observe(el);
  };
  ST.fine = matchMedia('(pointer: fine)').matches;

  if (G) {
    const plugins = [ScrollTrigger];
    if (window.Draggable) plugins.push(Draggable);
    if (window.InertiaPlugin) plugins.push(InertiaPlugin);
    if (window.SplitText) plugins.push(SplitText);
    gsap.registerPlugin(...plugins);
    gsap.defaults({ ease: 'power3.out' });
  }

  /* ── плавный скролл ── */
  let lenis = null;
  if (window.Lenis && !ST.reduced) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, touchMultiplier: 1.4 });
    if (G) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.addEventListener('refresh', () => lenis.resize());
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  ST.lenis = lenis;
  ST.scrollTo = (target, opt = {}) => {
    if (lenis) return lenis.scrollTo(target, Object.assign({ duration: 1.4 }, opt));
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + (opt.offset || 0);
    window.scrollTo({ top: y, behavior: ST.reduced ? 'auto' : 'smooth' });
  };

  // якоря — через Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const t = id === '#top' ? 0 : id.length > 1 && document.querySelector(id);
    if (t === null || t === undefined || t === false) return;
    e.preventDefault();
    closeMenu();
    ST.scrollTo(t === 0 ? 0 : t, { offset: t && t.id === 'tariffs' ? 0 : -8 });
    if (t && t.focus) { t.setAttribute('tabindex', '-1'); setTimeout(() => t.focus({ preventScroll: true }), 900); }
  });

  /* ── статус «открыто/закрыто» во всех местах ── */
  function updateStatus() {
    const s = ST.status();
    for (const el of $$('[data-status-short]')) el.innerHTML = s.open ? `<b>ОТКРЫТО</b> · ДО ${s.to}` : `ЗАКРЫТО · С ${s.from}`;
    for (const el of $$('[data-status-long]')) el.textContent = s.open ? `сейчас открыто, до ${s.to}` : `сейчас закрыто, откроемся в ${s.from}`;
    ST.isOpen = s.open;
  }

  /* ── мини-часы в шапке ── */
  let mini;
  const mh = $('.hdr-gauge');
  if (mh) mini = new ST.Gauge(mh, { arc: [0, 360], mini: true, zones: [{ f0: 10 / 24, f1: 1 }] });
  function tickMini() {
    const n = ST.kazanNow();
    if (mini) { mini.state.main = ((n.h + n.m / 60) / 24) * 360; mini.render(); }
  }

  /* ── шапка: прозрачная → плашка, прячется при скролле вниз ── */
  const hdr = $('#hdr');
  let lastY = 0, menuOpen = false;
  function onScroll(y) {
    hdr.classList.toggle('is-solid', y > 80);
    const down = y > lastY;
    if (!menuOpen) hdr.classList.toggle('is-hidden', down && y > 240);
    lastY = y;
  }
  if (lenis) lenis.on('scroll', (l) => onScroll(l.scroll)); else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* ── мобильное меню ── */
  const burger = $('.burger'), menu = $('#mmenu');
  function openMenu() {
    menuOpen = true; menu.hidden = false; burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Закрыть меню');
    hdr.classList.remove('is-hidden'); hdr.classList.add('is-solid');
    if (lenis) lenis.stop();
    if (G && !ST.reduced) {
      gsap.fromTo($$('.mmenu-nav span', menu), { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out' });
      gsap.fromTo($('.mmenu-foot', menu), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.25 });
    }
    $('.mmenu-nav a', menu).focus();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню');
    if (lenis) lenis.start();
    onScroll(lenis ? lenis.scroll : scrollY);
  }
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { closeMenu(); burger.focus(); } });
  ST.closeMenu = closeMenu;

  /* ── курсор ── */
  function cursor() {
    if (!ST.fine || ST.reduced) return;
    const c = $('.cursor'), lab = $('.cursor-label', c);
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, shown = false;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!shown) { cx = x; cy = y; shown = true; c.classList.remove('is-hidden'); } }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, [role="slider"]');
      let text = '';
      if (t) text = t.dataset.cursor || (t.matches('[role="slider"]') ? 'КРУТИ' : 'ЕХАТЬ');
      lab.textContent = text;
      c.classList.toggle('is-big', !!text);
    });
    document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => c.classList.remove('is-hidden'));
    const loop = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ── магнитные кнопки ── */
  function magnetic() {
    if (!G || !ST.fine || ST.reduced) return;
    for (const b of $$('[data-magnetic]')) {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 12);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    }
  }

  /* ── хром-лента: скорость = база + скорость скролла, направление — по скроллу ── */
  function ribbon() {
    const track = $('.ribbon-track');
    if (!track) return;
    const row = $('.ribbon-row', track);
    const w = () => row.offsetWidth;
    while (track.offsetWidth < innerWidth * 2.4) track.appendChild(row.cloneNode(true)).setAttribute('aria-hidden', 'true');
    if (ST.reduced || !G) return;
    let x = 0, dir = 1, vel = 0;
    if (lenis) lenis.on('scroll', (l) => { if (l.direction) dir = l.direction; vel = l.velocity; });
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(track);
    gsap.ticker.add((t, dt) => {
      if (!visible) return;
      const speed = 70 + Math.min(900, Math.abs(vel) * 28);
      x -= dir * speed * (dt / 1000);
      const W = w();
      if (x <= -W) x += W; if (x > 0) x -= W;
      track.style.transform = `translate3d(${x}px,0,0)`;
      vel *= 0.92;
    });
  }

  /* ── появления: блоки, заголовки по словам, фото ── */
  function reveals() {
    if (!G || ST.reduced) return;
    for (const el of $$('[data-rv]')) {
      ST.onEnter(el, () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }));
    }
    if (window.SplitText) {
      for (const h of $$('[data-split]')) {
        const split = SplitText.create(h, { type: 'words', wordsClass: 'sw-w', mask: 'words', aria: 'none' });
        gsap.set(split.words, { yPercent: 110 });
        ST.onEnter(h, () => gsap.to(split.words, { yPercent: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }), '-14%');
      }
    }
    for (const f of $$('[data-photo]')) {
      const img = $('img', f);
      ST.onEnter(f, () => gsap.timeline()
        .to(f, { clipPath: 'inset(0%)', duration: 1.1, ease: 'expo.out' })
        .to(img, { scale: 1, duration: 1.1, ease: 'expo.out' }, 0));
    }
  }

  /* ── манифест: слова проявляются по скроллу, фото из сепии оживает в цвет, царапины тают ── */
  function manifest() {
    const p = $('[data-words]'), frame = $('.mf-frame'), sc = $('.mf-scratch');
    if (!p) return;
    // царапины и пылинки плёнки — генерируются, без картинок
    if (sc) {
      let d = '';
      for (let i = 0; i < 14; i++) {
        const x = Math.random() * 400, y0 = Math.random() * 300, len = 80 + Math.random() * 300;
        d += `<path d="M${x.toFixed(1)} ${y0.toFixed(1)}q${(Math.random() * 6 - 3).toFixed(1)} ${(len / 2).toFixed(1)} ${(Math.random() * 4 - 2).toFixed(1)} ${len.toFixed(1)}"/>`;
      }
      for (let i = 0; i < 26; i++) d += `<circle cx="${(Math.random() * 400).toFixed(1)}" cy="${(Math.random() * 500).toFixed(1)}" r="${(0.6 + Math.random() * 1.6).toFixed(1)}"/>`;
      sc.innerHTML = d;
    }
    if (!G || ST.reduced) return;
    // слова — свои спаны; неразрывные пробелы держат «не просто» вместе
    const parts = p.textContent.split(' ');
    p.innerHTML = parts.map((w) => `<span class="wd">${w}</span>`).join(' ');
    const words = $$('.wd', p);
    gsap.fromTo(words, { color: 'rgba(243, 238, 230, .15)' }, {
      color: '#F3EEE6', ease: 'none', stagger: 0.1, immediateRender: false,
      scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom 45%', scrub: true },
    });
    if (frame) {
      gsap.fromTo(frame, { '--sep': 1, '--sat': 0.4, '--con': 1.1, '--scr': 0.9 }, {
        '--sep': 0, '--sat': 1.05, '--con': 1, '--scr': 0, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top 90%', end: 'center 40%', scrub: true },
      });
    }
    const arrow = $$('.mf-arrow path');
    arrow.forEach((a) => { a.setAttribute('pathLength', '1'); a.style.strokeDasharray = '1'; });
    gsap.set(arrow, { strokeDashoffset: 1 });
    gsap.set('.mf-note span', { opacity: 0, y: 10 });
    ST.onEnter($('.mf-photo'), () => gsap.timeline()
      .to('.mf-note span', { opacity: 1, y: 0, duration: 0.6 })
      .to(arrow, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.2), '-40%');
  }

  /* ── нижняя панель на телефоне ── */
  function mbar() {
    const bar = $('.mbar'), hero = $('.hero');
    if (!bar || !hero) return;
    new IntersectionObserver(([e]) => {
      const on = !e.isIntersecting;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      for (const a of $$('a', bar)) a.tabIndex = on ? 0 : -1;
    }, { threshold: 0.12 }).observe(hero);
  }

  /* ── прелоадер «Заводимся» ── */
  function preloader() {
    if (!html.hasAttribute('data-pre')) return Promise.resolve(false);
    try { sessionStorage.setItem('st-pre', '1'); } catch (e) {}
    const pre = $('.pre');
    if (!G) { pre.style.display = 'none'; return Promise.resolve(true); }
    const g = new ST.Gauge($('.pre-gauge'), {
      arc: [-120, 120], ticks: 40, major: 5,
      labels: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ f: n / 8, t: String(n) })), labelR: 124, labelSize: 34,
      zones: [{ f0: 0.78, f1: 1 }], odometer: 5, odoTop: 0.6, captions: [{ t: '×1000', y: 300, size: 18 }],
    });
    g.setFraction(0, { instant: true });
    g.setOdometer('00:00', { instant: true });
    return new Promise((res) => {
      const tl = gsap.timeline({ onComplete: () => { pre.style.display = 'none'; res(true); } });
      tl.add(() => g.setOdometer(ST.kazanNow().hhmm, { spin: true, duration: 0.85, stagger: 0.05 }), 0.05)
        .to(g.state, { main: g.ang(0.86), duration: 0.32, ease: 'power2.in', onUpdate: () => g.render() }, 0.42)
        .to(g.state, { main: g.ang(0.12), duration: 0.5, ease: 'back.out(1.6)', onUpdate: () => g.render() }, 0.76)
        .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.42, ease: 'power3.inOut' }, 1.0);
    });
  }

  /* ── старт ── */
  function boot() {
    updateStatus();
    tickMini();
    setInterval(() => { updateStatus(); tickMini(); }, 30000);
    const intro = preloader();
    const run = (name, fn) => { try { fn(); } catch (err) { console.error('[' + name + ']', err); } };
    // первый экран — сразу
    run('hero', () => ST.hero && ST.hero.init({ intro }));
    run('lightbox', () => ST.lightbox && ST.lightbox.init());
    run('ribbon', ribbon);
    mbar();
    cursor();
    // остальное — по одной секции в простое, чтобы не держать первый кадр; пин тарифов — первым
    const mod = (m) => () => ST[m] && ST[m].init({ intro });
    const queue = [
      ['tariffs', mod('tariffs')], ['manifest', manifest], ['garage', mod('garage')], ['postcards', mod('postcards')],
      ['film', mod('film')], ['radio', mod('radio')], ['passport', mod('passport')], ['finale', mod('finale')], ['magnetic', magnetic],
      ['ready', () => {
        if (!G) return;
        html.setAttribute('data-ready', '');
        reveals();
        // один пересчёт после сборки (на load ScrollTrigger пересчитывает сам); дальше — только если реально
        // поменялась высота страницы (картинки, шрифты), а не на первый вызов наблюдателя
        if (document.readyState === 'complete') ScrollTrigger.refresh();
        let rt, lastH = document.body.offsetHeight;
        new ResizeObserver(() => {
          const h = document.body.offsetHeight;
          if (Math.abs(h - lastH) < 2) return;
          lastH = h; clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 250);
        }).observe(document.body);
      }],
    ];
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 30));
    const next = () => { const t = queue.shift(); if (!t) return; run(t[0], t[1]); idle(next, { timeout: 250 }); };
    idle(next, { timeout: 250 });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
