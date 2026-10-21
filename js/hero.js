/* HERO: живые часы Казани (24-часовой спидометр), ключ зажигания, фара на фото. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  // фара мопеда на кадре hero (доли ширины/высоты исходника 1390×1472)
  const LAMP = [0.317, 0.413], IMG = [1390, 1472], POS_Y = 0.08;

  ST.hero = {
    init({ intro }) {
      const host = $('[data-hero-gauge]');
      if (!host) return;
      const hours = [];
      for (let h = 0; h < 24; h += 2) hours.push({ f: h / 24, t: String(h).padStart(2, '0') });
      const g = (this.g = new ST.Gauge(host, {
        arc: [0, 360], ticks: 96, major: 4, labels: hours, labelR: 126, labelSize: 25,
        zones: [{ f0: 10 / 24, f1: 1 }], hands: ['hour', 'minute', 'second'],
        odometer: 18, odoTop: 0.555, captions: [{ t: 'ВРЕМЯ КАЗАНИ', y: 142, size: 13 }],
      }));

      /* часы: раз в секунду, секундная стрелка «тикает» с отскоком */
      let sweeping = false, lastStatus = null;
      const unwrap = (cur, tgt) => { while (tgt < cur - 180) tgt += 360; while (tgt > cur + 180) tgt -= 360; return tgt; };
      const hourAngle = () => { const n = ST.kazanNow(); return unwrap(g.state.hour, ((n.h + n.m / 60 + n.s / 3600) / 24) * 360); };
      function tick(first) {
        const n = ST.kazanNow();
        if (!sweeping) g.state.hour = first ? ((n.h + n.m / 60) / 24) * 360 : hourAngle();
        g.state.minute = unwrap(g.state.minute, ((n.m + n.s / 60) / 60) * 360);
        const sec = unwrap(g.state.second, n.s * 6);
        if (first || ST.reduced || !window.gsap) { g.state.second = sec; g.render(); }
        else gsap.to(g.state, { second: sec, duration: 0.35, ease: 'back.out(3)', overwrite: 'auto', onUpdate: () => g.render() });
        g.render();
        const s = ST.status(n);
        const text = s.open ? `ОТКРЫТО · ДО ${s.to}` : `ОТКРОЕМСЯ В ${s.from}`;
        if (text !== lastStatus) {
          g.setOdometer(text, { instant: first });
          host.setAttribute('aria-label', `Часы: в Казани ${n.hhmm}. ${s.open ? 'Сейчас открыто, до ' + s.to : 'Сейчас закрыто, откроемся в ' + s.from}`);
          lastStatus = text;
        } else if (n.s === 0) host.setAttribute('aria-label', `Часы: в Казани ${n.hhmm}. ${s.open ? 'Сейчас открыто, до ' + s.to : 'Сейчас закрыто, откроемся в ' + s.from}`);
      }
      tick(true);
      setTimeout(function loop() { tick(false); setTimeout(loop, 1000 - (Date.now() % 1000) + 5); }, 1000 - (Date.now() % 1000) + 5);

      /* фара — пятно точно на фаре мопеда при любом кропе object-fit: cover */
      const par = $('.hero-par'), lamp = $('.hero-lamp'), img = $('.hero-img');
      function placeLamp() {
        const w = par.clientWidth, h = par.clientHeight;
        const s = Math.max(w / IMG[0], h / IMG[1]);
        const dw = IMG[0] * s, dh = IMG[1] * s;
        lamp.style.setProperty('--lx', ((w - dw) * 0.5 + LAMP[0] * dw).toFixed(1) + 'px');
        lamp.style.setProperty('--ly', ((h - dh) * POS_Y + LAMP[1] * dh).toFixed(1) + 'px');
      }
      placeLamp();
      addEventListener('resize', placeLamp);

      /* ключ зажигания */
      const btn = $('[data-hero-key]'), note = $('.hero-key-note');
      const key = new ST.Ignition(btn, { ring: 'THE SCOOTER TIME · КАЗАНЬ ·', center: 'ST' });
      btn.addEventListener('click', () => {
        const on = key.toggle();
        btn.setAttribute('aria-label', on ? 'Заглушить мотор: повернуть ключ обратно' : 'Повернуть ключ зажигания');
        note.textContent = on ? 'заведено!' : 'поверните';
        if (!window.gsap || ST.reduced) { lamp.style.opacity = on ? 0.35 : 0; return; }
        gsap.killTweensOf(lamp);
        if (on) {
          gsap.timeline().to(lamp, { opacity: 1, duration: 0.16, ease: 'power2.out' }).to(lamp, { opacity: 0.35, duration: 1.3, ease: 'power2.inOut' });
          sweeping = true;
          const tl = g.sweep(hourAngle);
          if (tl) tl.eventCallback('onComplete', () => (sweeping = false)); else sweeping = false;
          gsap.fromTo(img, { scale: 1.04, filter: 'blur(2px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out', clearProps: 'filter' });
          g.glint();
        } else {
          gsap.to(lamp, { opacity: 0, duration: 0.5, ease: 'power2.out' });
          gsap.fromTo(img, { scale: 1.012 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
        }
      });

      if (!window.gsap || ST.reduced) return;
      /* прибор «вкручивается», по ободку — блик */
      intro.then((wasPre) => {
        gsap.fromTo(host, { rotate: -20, scale: 0.9, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'back.out(1.4)', delay: wasPre ? 0.2 : 0.35, onComplete: () => g.glint() });
        gsap.fromTo('.hero-key', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, delay: wasPre ? 0.6 : 0.75 });
      });
      gsap.set(host, { opacity: 0 });

      /* параллакс фото ±40px */
      gsap.fromTo(par, { y: -20 }, { y: 40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    },
  };
})();
