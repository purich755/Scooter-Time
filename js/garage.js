/* Гараж: карусель мопедов (Draggable + инерция на мыши, нативный scroll-snap на тач-экранах),
   ключ на каждой карточке — наведение/тап поворачивает его, загорается фара, брелок качается
   от скорости ленты. Имена из ST_CONFIG.scooters: задано name — гравировка показывает его. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const C = window.ST_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  ST.garage = {
    init() {
      const view = $('.garage-view'), track = $('.garage-track');
      if (!view) return;
      const cards = $$('.car', track);
      const keys = cards.map((card, i) => {
        const sc = C.scooters[i] || {};
        const btn = $('[data-key]', card);
        const ig = new ST.Ignition(btn, sc.name ? { name: sc.name, ring: 'THE SCOOTER TIME · КАЗАНЬ ·' } : {});
        if (sc.name) btn.setAttribute('aria-label', `Повернуть ключ: ${sc.color.toLowerCase()} мопед по имени ${sc.name}`);
        const setOn = (on) => { ig.set(on); card.classList.toggle('is-on', on); };
        btn.addEventListener('click', () => setOn(!ig.on));
        if (ST.fine) {
          btn.addEventListener('pointerenter', () => setOn(true));
          card.addEventListener('pointerleave', () => setOn(false));
        }
        return ig;
      });
      const kick = (v) => { for (const k of keys) k.kick(v); };

      const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 360);
      const useDrag = ST.fine && window.Draggable && window.gsap && !ST.reduced;

      if (!useDrag) {
        /* нативная прокрутка со снапом; брелоки качаются от скорости scrollLeft */
        view.classList.add('is-native');
        let lastX = view.scrollLeft, lastT = performance.now();
        view.addEventListener('scroll', () => {
          const t = performance.now(), dx = view.scrollLeft - lastX;
          kick(-Math.max(-60, Math.min(60, (dx / Math.max(8, t - lastT)) * 16)));
          lastX = view.scrollLeft; lastT = t;
        }, { passive: true });
        const by = (d) => view.scrollBy({ left: d * step(), behavior: ST.reduced ? 'auto' : 'smooth' });
        $('[data-garage-prev]').addEventListener('click', () => by(-1));
        $('[data-garage-next]').addEventListener('click', () => by(1));
        return;
      }

      view.classList.add('is-drag-mode');
      const minX = () => Math.min(0, view.clientWidth - track.scrollWidth);
      let dragged = false, lastX = 0;
      const d = Draggable.create(track, {
        type: 'x', inertia: true, edgeResistance: 0.85, dragClickables: true, allowContextMenu: true,
        bounds: { minX: minX(), maxX: 0 },
        snap: (v) => Math.max(minX(), Math.min(0, Math.round(v / step()) * step())),
        onPress() { dragged = false; lastX = this.x; },
        onDragStart() { dragged = true; track.classList.add('is-drag'); },
        onDrag() { kick(-(this.x - lastX) * 0.9); lastX = this.x; },
        onThrowUpdate() { kick(-(this.x - lastX) * 0.9); lastX = this.x; },
        onRelease() { track.classList.remove('is-drag'); },
      })[0];
      // после перетаскивания клик по фото/ключу не должен срабатывать
      track.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); e.stopImmediatePropagation(); dragged = false; } }, true);
      for (const img of $$('img', track)) img.addEventListener('dragstart', (e) => e.preventDefault());

      const moveTo = (x, dur = 0.8) => {
        x = Math.max(minX(), Math.min(0, x));
        const from = d.x;
        gsap.to(track, { x, duration: dur, ease: 'power3.out', onUpdate() { d.update(); kick(-(d.x - lastX) * 0.9); lastX = d.x; } });
        lastX = from;
      };
      const by = (n) => moveTo(Math.round(d.x / step()) * step() - n * step());
      $('[data-garage-prev]').addEventListener('click', () => by(-1));
      $('[data-garage-next]').addEventListener('click', () => by(1));
      view.addEventListener('keydown', (e) => {
        if (e.target !== view) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); by(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1); }
      });
      // горизонтальное колесо / трекпад
      let wheelT;
      view.addEventListener('wheel', (e) => {
        const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
        if (!dx) return;
        e.preventDefault();
        const x = Math.max(minX(), Math.min(0, d.x - dx));
        gsap.set(track, { x }); d.update(); kick(-dx * 0.5);
        clearTimeout(wheelT);
        wheelT = setTimeout(() => moveTo(Math.round(d.x / step()) * step(), 0.5), 160);
      }, { passive: false });
      addEventListener('resize', () => { d.applyBounds({ minX: minX(), maxX: 0 }); });
    },
  };
})();
