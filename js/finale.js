/* Финал «Время ехать.»: линейный скутер прорисовывается, потом по скроллу уезжает вправо за край,
   колёса крутятся, за ним остаётся пунктир дороги; маленький прибор уходит в ноль. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  ST.finale = {
    init() {
      const sec = $('.finale');
      if (!sec) return;
      const host = $('[data-fin-gauge]', sec);
      const g = new ST.Gauge(host, {
        arc: [-120, 120], ticks: 30, major: 5, labels: [0, 20, 40, 60].map((n, i) => ({ f: i / 3, t: String(n) })),
        labelR: 122, labelSize: 34, odometer: 10, odoTop: 0.64,
      });
      g.setFraction(0.62, { instant: true });
      g.setOdometer('ПОЕХАЛИ', { instant: true });
      if (!window.gsap || !window.ScrollTrigger || ST.reduced) { g.setFraction(0, { instant: true }); g.setOdometer('ДО ВСТРЕЧИ', { instant: true }); return; }

      const ride = $('.fin-ride', sec), road = $('.fin-dash', sec);
      const strokes = $$('.fin-scooter path, .fin-scooter circle, .fin-scooter ellipse', sec);
      for (const s of strokes) { s.setAttribute('pathLength', '1'); s.style.strokeDasharray = '1'; }
      gsap.set(strokes, { strokeDashoffset: 1, opacity: 0 });
      gsap.set(road, { clipPath: 'inset(0 50% 0 0)' });
      // прорисовка
      ST.onEnter($('.fin-road', sec), () => gsap.to(strokes, {
        strokeDashoffset: 0, duration: 1, ease: 'power2.inOut',
        stagger: { each: 0.05, onStart() { gsap.set(this.targets(), { opacity: 1 }); } },
      }));
      const h2 = $('.fin-h2', sec);
      gsap.set(h2, { yPercent: 30, opacity: 0 });
      ST.onEnter(h2, () => gsap.to(h2, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }), '-12%');
      // уезжает: от середины экрана за правый край
      const wheels = $$('.sc-wheel', sec);
      let said = false;
      gsap.timeline({
        scrollTrigger: {
          trigger: '.fin-road', start: 'top 45%', end: () => ScrollTrigger.maxScroll(window), scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => {
            g.state.main = g.ang(0.62 * (1 - self.progress)); g.render();
            const end = self.progress > 0.9;
            if (end !== said) { said = end; g.setOdometer(end ? 'ДО ВСТРЕЧИ' : 'ПОЕХАЛИ'); }
          },
        },
      })
        .to(ride, { x: () => innerWidth / 2 + ride.offsetWidth, ease: 'power1.in' }, 0)
        .to(wheels[0], { rotation: 900, svgOrigin: '150 284', ease: 'power1.in' }, 0)
        .to(wheels[1], { rotation: 900, svgOrigin: '440 284', ease: 'power1.in' }, 0)
        .to(road, { clipPath: 'inset(0 0% 0 0)', ease: 'power1.in' }, 0);
    },
  };
})();
