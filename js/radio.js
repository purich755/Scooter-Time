/* Радио «После поездки»: ручку настройки крутят (drag по кругу) или кликают станции.
   Между станциями — помехи: шум на canvas и буквы цитаты дрожат и подменяются.
   Попал на станцию — текст «настраивается», бегунок защёлкивается, лампа теплеет. Звука нет. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REVIEWS = [
    { name: 'МАША', text: 'Были в Казани проездом, арендовали, покатались — всё очень понравилось.' },
    { name: 'DAVID', text: 'Спасибо за незабываемые ощущения, всё очень понравилось, надеюсь, прокачусь как-нибудь ещё.' },
    { name: 'ГОСТЬ', text: 'Очень понравилось!' },
  ];
  const ST_POS = [0.18, 0.5, 0.82];
  const GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯабвгдежзиклмнопрстуфхцчшэюя0123456789#%&*/\\—';

  ST.radio = {
    init() {
      const sec = $('.radio-sec'), radio = $('[data-radio]', sec);
      if (!radio) return;
      const knob = $('[data-knob]', radio), knobIn = $('.knob-in', knob);
      const scale = $('[data-dial]', radio), ptr = $('.dial-ptr', radio);
      const stations = $$('[data-station]', radio);
      const textEl = $('[data-air-text]', sec), nameEl = $('[data-air-name]', sec);
      const canvas = $('.air-noise', sec), ctx = canvas.getContext('2d');
      const live = document.createElement('p');
      live.className = 'visually-hidden'; live.setAttribute('aria-live', 'polite');
      sec.appendChild(live);
      $('.air-q', sec).setAttribute('aria-hidden', 'true');

      let p = ST_POS[0], tuned = 0, raf = 0, tunedAt = 0, tw = null, visible = false;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) render(); }).observe(sec);
      const near = () => { let b = 0, bd = 9; ST_POS.forEach((s, i) => { const d = Math.abs(s - p); if (d < bd) { bd = d; b = i; } }); return [b, bd]; };

      function scramble(src, amount) {
        let out = '';
        for (const ch of src) out += ch === ' ' || ch === ' ' || Math.random() > amount ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        return out;
      }
      function noise(alpha) {
        const { width: w, height: h } = canvas;
        const img = ctx.createImageData(w, h), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        ctx.putImageData(img, 0, 0);
        canvas.style.opacity = alpha;
      }
      function frame() {
        raf = 0;
        if (!visible) return;
        const [b, bd] = near();
        const off = Math.min(1, bd / 0.12);
        if (bd < 0.03) {
          // настройка: 400 мс от каши к чистому тексту
          if (tuned !== b) { tuned = b; tunedAt = performance.now(); live.textContent = `${REVIEWS[b].name}: ${REVIEWS[b].text}`; }
          const k = Math.min(1, (performance.now() - tunedAt) / 400);
          textEl.textContent = scramble(REVIEWS[b].text, (1 - k) * 0.7);
          nameEl.textContent = REVIEWS[b].name;
          noise((1 - k) * 0.12);
          radio.classList.add('is-tuned'); sec.classList.add('is-tuned');
          stations.forEach((s, i) => s.classList.toggle('is-on', i === b));
          if (k < 1) raf = requestAnimationFrame(frame); else canvas.style.opacity = 0;
          return;
        }
        tuned = -1;
        radio.classList.remove('is-tuned'); sec.classList.remove('is-tuned');
        stations.forEach((s) => s.classList.remove('is-on'));
        textEl.textContent = scramble(REVIEWS[b].text, 0.25 + off * 0.65);
        nameEl.textContent = scramble(REVIEWS[b].name, 0.5 + off * 0.5);
        noise(0.08 + off * 0.18);
        textEl.style.transform = `translate(${(Math.random() - 0.5) * 3 * off}px, ${(Math.random() - 0.5) * 2 * off}px)`;
        raf = requestAnimationFrame(frame);
      }
      function render() {
        ptr.style.setProperty('--p', p);
        knobIn.style.transform = `rotate(${(p * 540 - 97).toFixed(1)}deg)`;
        knob.setAttribute('aria-valuenow', Math.round(p * 100));
        const [b] = near();
        knob.setAttribute('aria-valuetext', REVIEWS[b].name === 'ГОСТЬ' ? 'Гость' : REVIEWS[b].name === 'МАША' ? 'Маша' : 'David');
        if (ST.reduced) {
          textEl.textContent = REVIEWS[b].text; nameEl.textContent = REVIEWS[b].name;
          stations.forEach((s, i) => s.classList.toggle('is-on', i === b));
          radio.classList.add('is-tuned'); sec.classList.add('is-tuned');
          if (tuned !== b) { tuned = b; live.textContent = `${REVIEWS[b].name}: ${REVIEWS[b].text}`; }
          return;
        }
        textEl.style.transform = '';
        if (!raf) raf = requestAnimationFrame(frame);
      }
      function glide(to, dur = 0.9) {
        if (!window.gsap || ST.reduced) { p = to; render(); return; }
        const o = { p };
        if (tw) tw.kill();
        tw = gsap.to(o, { p: to, duration: dur, ease: 'power2.inOut', onUpdate: () => { p = o.p; render(); } });
      }
      const snap = () => glide(ST_POS[near()[0]], 0.45);

      stations.forEach((s, i) => s.addEventListener('click', () => glide(ST_POS[i])));

      /* ручка: крутим по кругу, 1.5 оборота на всю шкалу */
      let drag = null;
      knob.addEventListener('pointerdown', (e) => {
        const r = knob.getBoundingClientRect();
        drag = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, a: Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) };
        if (tw) tw.kill();
        e.preventDefault();
      });
      /* шкалу можно тянуть пальцем */
      let sdrag = false;
      const fromScale = (e) => { const r = scale.getBoundingClientRect(); p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); render(); };
      scale.addEventListener('pointerdown', (e) => { if (tw) tw.kill(); sdrag = true; fromScale(e); e.preventDefault(); });
      addEventListener('pointermove', (e) => {
        if (sdrag) return fromScale(e);
        if (!drag) return;
        const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
        let da = a - drag.a; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        drag.a = a;
        p = Math.max(0, Math.min(1, p + (da * 180) / Math.PI / 540));
        render();
      });
      addEventListener('pointerup', () => { if (drag || sdrag) { drag = null; sdrag = false; snap(); } });
      knob.addEventListener('keydown', (e) => {
        const [b] = near();
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); glide(ST_POS[Math.min(2, b + 1)], 0.6); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); glide(ST_POS[Math.max(0, b - 1)], 0.6); }
      });

      /* автонастройка при первом появлении: с помех на первую станцию */
      p = 0.03; render();
      if (window.gsap && !ST.reduced) ST.onEnter(radio, () => glide(ST_POS[0], 1.8), '-30%');
      else { p = ST_POS[0]; render(); }
    },
  };
})();
