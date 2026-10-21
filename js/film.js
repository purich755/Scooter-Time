/* «Наши клиенты»: две плёнки едут в разные стороны при вертикальном скролле,
   наклоняются от скорости скролла и затухают; пометки «жировым карандашом» прорисовываются. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  ST.film = {
    init() {
      const sec = $('.film');
      if (!sec) return;
      const strips = $$('.strip', sec);
      if (!window.gsap || !window.ScrollTrigger || ST.reduced) {
        // без анимаций плёнку можно прокрутить пальцем/колесом
        for (const s of strips) s.classList.add('is-scroll');
        return;
      }
      const tracks = strips.map((s) => $('.strip-track', s));
      tracks.forEach((t, i) => {
        const dir = +strips[i].dataset.strip;
        const dist = () => Math.max(0, t.scrollWidth - innerWidth);
        gsap.fromTo(t, { x: () => (dir > 0 ? 0 : -dist()) }, {
          x: () => (dir > 0 ? -dist() : 0), ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
        });
      });
      // наклон от скорости
      const skew = tracks.map((t) => gsap.quickTo(t, 'skewX', { duration: 0.6, ease: 'power3.out' }));
      let settle;
      ScrollTrigger.create({
        trigger: sec, start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const v = Math.max(-6, Math.min(6, self.getVelocity() / 260));
          skew.forEach((q, i) => q(i ? v : -v));
          clearTimeout(settle);
          settle = setTimeout(() => skew.forEach((q) => q(0)), 120);
        },
      });
      // пометки карандашом
      const marks = $$('.fr-mark path', sec);
      for (const p of marks) {
        const fr = p.closest('.fr'), note = $('.fr-note', fr);
        gsap.set(p, { strokeDashoffset: 1, opacity: 0 });
        if (note) gsap.set(note, { opacity: 0, scale: 0.6 });
        ST.onEnter(fr, () => gsap.timeline({ delay: 0.2 + Math.random() * 0.4 })
          .set(p, { opacity: 0.92 })
          .to(p, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' })
          .to(note || {}, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, '-=0.2'), '-25%');
      }
    },
  };
})();
