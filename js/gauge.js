/* Gauge — ретро-прибор: хромированный ободок, кремовый циферблат, оранжевая стрелка, окошко одометра.
   Один компонент на прелоадер, hero-часы, тарифы, финал и мини-часы в шапке.
     const g = new ST.Gauge(host, { arc: [-120, 120], labels: [...], odometer: 9 });
     g.setAngle(deg) · g.setFraction(f) · g.setOdometer('1 000 ₽') · g.sweep()
   Без GSAP всё работает мгновенно, с GSAP — с овершутом. */
(function () {
  'use strict';
  const ST = (window.ST = window.ST || {});
  const C = window.ST_CONFIG;

  /* ── время Казани и статус «открыто/закрыто» — общие для всех приборов ── */
  const fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: C.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  ST.kazanNow = function () {
    const p = {};
    for (const x of fmt.formatToParts(new Date())) p[x.type] = x.value;
    const h = +p.hour % 24, m = +p.minute, s = +p.second;
    return { h, m, s, hhmm: String(h).padStart(2, '0') + ':' + p.minute };
  };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  ST.status = function (now = ST.kazanNow()) {
    const open = toMin(C.hours.open);
    let close = toMin(C.hours.close); if (close <= open) close += 1440;
    let t = now.h * 60 + now.m; if (t < open && t + 1440 < close) t += 1440;
    return { open: t >= open && t < close, from: C.hours.open, to: C.hours.close };
  };
  ST.money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';

  const NS = 'http://www.w3.org/2000/svg';
  const R = (v) => Math.round(v * 100) / 100;
  let uid = 0;
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const polar = (r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [R(200 + r * Math.cos(a)), R(200 + r * Math.sin(a))]; };
  function arcD(r, a0, a1) {
    const [x0, y0] = polar(r, a0), [x1, y1] = polar(r, a1);
    return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  }

  class Gauge {
    constructor(host, opts = {}) {
      this.o = Object.assign({
        arc: [-120, 120],   // градусы от «12 часов» по часовой
        ticks: 40, major: 5,
        labels: [],         // [{ f: 0..1, t: 'текст', cls }]
        labelR: 128, labelSize: 26,
        zones: [],          // [{ f0, f1 }] — оранжевая «красная зона»
        hands: ['main'],    // 'main' | 'hour' | 'minute' | 'second'
        odometer: 0,        // число барабанов
        odoTop: 0.66,       // положение окошка по высоте
        captions: [],       // [{ t, y, cls }] — подписи на циферблате
        mini: false,
      }, opts);
      this.host = host;
      this.state = { main: this.o.arc[0], hour: 0, minute: 0, second: 0 };
      this.id = 'gg' + ++uid;
      host.classList.add('gauge');
      if (this.o.mini) host.classList.add('gauge--mini');
      this.build();
      this.render();
    }

    build() {
      const o = this.o, id = this.id;
      const svg = (this.svg = el('svg', { viewBox: '0 0 400 400', class: 'gauge-svg', 'aria-hidden': 'true', focusable: 'false' }));
      const defs = el('defs', {}, svg);
      const lg = (gid, x1, y1, x2, y2, stops) => {
        const g = el('linearGradient', { id: gid, x1, y1, x2, y2 }, defs);
        for (const [off, col] of stops) el('stop', { offset: off, 'stop-color': col }, g);
      };
      const chrome = [[0, '#F4F4F2'], [0.4, '#A9ABAE'], [0.6, '#5E6064'], [1, '#F4F4F2']];
      lg(id + 'c1', 0, 0, 1, 1, chrome);
      lg(id + 'c2', 1, 1, 0, 0, chrome);
      lg(id + 'cap', 0, 0, 1, 1, [[0, '#FFFFFF'], [0.45, '#B9BBBE'], [1, '#4A4C50']]);
      const rg = el('radialGradient', { id: id + 'f', cx: 0.5, cy: 0.42, r: 0.62 }, defs);
      el('stop', { offset: 0, 'stop-color': '#F6EEDD' }, rg);
      el('stop', { offset: 0.72, 'stop-color': '#EDE3CF' }, rg);
      el('stop', { offset: 1, 'stop-color': '#CDBE9F' }, rg);

      // ободок: два кольца хрома + тёмный зазор
      el('circle', { cx: 200, cy: 200, r: 198, fill: '#141311' }, svg);
      el('circle', { cx: 200, cy: 200, r: 195, fill: `url(#${id}c1)` }, svg);
      el('circle', { cx: 200, cy: 200, r: 184, fill: `url(#${id}c2)` }, svg);
      el('circle', { cx: 200, cy: 200, r: 177, fill: '#2a2824' }, svg);
      el('circle', { cx: 200, cy: 200, r: 175, fill: `url(#${id}f)` }, svg);

      const [a0, a1] = o.arc;
      const full = a1 - a0 >= 360;
      const ang = (f) => a0 + f * (a1 - a0);
      this.ang = ang;

      // зоны
      for (const z of o.zones) el('path', { d: arcD(o.mini ? 150 : 163, ang(z.f0), ang(z.f1)), class: 'g-zone', fill: 'none', 'stroke-width': o.mini ? 26 : 8 }, svg);

      if (!o.mini || o.ticksMini) {
        const tg = el('g', { class: 'g-ticks' }, svg);
        const n = o.ticks;
        for (let i = 0; i <= n; i++) {
          if (full && i === n) break;
          const isMajor = i % o.major === 0;
          const a = ang(i / n);
          const [x0, y0] = polar(170, a), [x1, y1] = polar(isMajor ? 152 : 161, a);
          el('line', { x1: x0, y1: y0, x2: x1, y2: y1, 'stroke-width': isMajor ? 3.2 : 1.4, class: isMajor ? 'g-major' : 'g-minor' }, tg);
        }
        const lg2 = (this.labelsG = el('g', { class: 'g-labels' }, svg));
        this.labelEls = o.labels.map((L, i) => {
          const [x, y] = polar(L.r || o.labelR, ang(L.f));
          const t = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'g-label ' + (L.cls || ''), 'font-size': L.size || o.labelSize, 'data-i': i }, lg2);
          t.textContent = L.t;
          return t;
        });
        for (const c of o.captions) {
          const t = el('text', { x: 200, y: c.y, 'text-anchor': 'middle', class: 'g-cap ' + (c.cls || ''), 'font-size': c.size || 13 }, svg);
          t.textContent = c.t;
        }
      } else {
        // мини-прибор: только крупные риски
        const tg = el('g', { class: 'g-ticks' }, svg);
        for (let i = 0; i < 8; i++) {
          const a = ang(i / (full ? 8 : 7));
          const [x0, y0] = polar(168, a), [x1, y1] = polar(132, a);
          el('line', { x1: x0, y1: y0, x2: x1, y2: y1, 'stroke-width': 16, class: 'g-major' }, tg);
        }
      }

      // стрелки (тень — смещённая копия, а не фильтр: дешевле при вращении)
      const handShapes = {
        main: o.mini ? 'M188 236L212 236L203 46L197 46Z' : 'M195.2 228L204.8 228L201.3 52L198.7 52Z',
        hour: 'M194.5 222L205.5 222L201.6 96L198.4 96Z',
        minute: 'M197.4 226L202.6 226L200.9 42L199.1 42Z',
        second: 'M199.3 236L200.7 236L200.5 36L199.5 36Z',
      };
      // стрелки живут во втором слое — поверх окошка одометра, как в настоящем приборе
      const top = (this.top = el('svg', { viewBox: '0 0 400 400', class: 'gauge-top', 'aria-hidden': 'true', focusable: 'false' }));
      this.handEls = {};
      for (const h of o.hands) {
        const shadow = el('path', { d: handShapes[h], class: 'g-shadow', transform: 'translate(3 5)' }, top);
        const p = el('path', { d: handShapes[h], class: 'g-hand g-hand--' + h }, top);
        this.handEls[h] = { p, shadow };
      }
      if (o.hands.includes('second')) el('circle', { cx: 200, cy: 200, r: 7, class: 'g-hand g-hand--second' }, top);
      el('circle', { cx: 200, cy: 200, r: o.mini ? 30 : 16, fill: `url(#${id}cap)` }, top);
      el('circle', { cx: 200, cy: 200, r: o.mini ? 10 : 5, fill: '#1C1B19' }, top);
      // блик стекла
      el('path', { d: 'M62 150A142 142 0 0 1 250 64A160 160 0 0 0 72 190Z', class: 'g-glass' }, top);

      this.host.appendChild(svg);
      if (!o.mini) {
        const glint = document.createElement('span');
        glint.className = 'gauge-glint';
        glint.setAttribute('aria-hidden', 'true');
        this.host.appendChild(glint);
        this.glintEl = glint;
      }
      if (o.odometer) this.buildOdometer(o.odometer);
      this.host.appendChild(top);
    }

    buildOdometer(n) {
      const w = document.createElement('div');
      w.className = 'odo';
      w.setAttribute('aria-hidden', 'true');
      w.style.top = this.o.odoTop * 100 + '%';
      w.style.setProperty('--cells', n);
      this.cells = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElement('span');
        c.className = 'odo-c';
        const s = document.createElement('span');
        s.className = 'odo-s';
        s.innerHTML = '<span> </span>';
        c.appendChild(s);
        c._ch = ' ';
        w.appendChild(c);
        this.cells.push(c);
      }
      this.host.appendChild(w);
      this.odoEl = w;
    }

    pad(text) {
      const n = this.cells.length;
      text = String(text).toUpperCase();
      if (text.length > n) text = text.slice(0, n);
      const left = Math.floor((n - text.length) / 2);
      return ' '.repeat(left) + text + ' '.repeat(n - text.length - left);
    }

    /* Барабаны: у каждой ячейки лента [старый … новый] и прокрутка вверх.
       spin — цифры проходят полный оборот (прелоадер). */
    setOdometer(text, opt = {}) {
      if (!this.cells) return;
      const t = this.pad(text);
      const g = window.gsap && !opt.instant && !ST.reduced;
      this.cells.forEach((cell, i) => {
        const ch = t[i];
        const old = cell._ch;
        if (old === ch && !opt.spin) return;
        let seq = [old, ch];
        if (opt.spin && /\d/.test(ch)) {
          seq = [old];
          const turns = 1 + (i % 2);
          for (let k = 0; k <= turns * 10 + +ch; k++) seq.push(String(k % 10));
        }
        cell._ch = ch;
        const strip = cell.firstChild;
        strip.innerHTML = seq.map((c) => `<span>${c === ' ' ? ' ' : c}</span>`).join('');
        if (!g) { strip.innerHTML = `<span>${ch === ' ' ? ' ' : ch}</span>`; return; }
        const end = (-100 * (seq.length - 1)) / seq.length;
        gsap.killTweensOf(strip);
        gsap.fromTo(strip, { yPercent: 0 }, {
          yPercent: end, duration: opt.duration || 0.55 + (opt.spin ? 0.5 : 0), delay: (opt.stagger ?? 0.025) * i, ease: 'power3.out',
          onComplete: () => { strip.innerHTML = `<span>${ch === ' ' ? ' ' : ch}</span>`; gsap.set(strip, { yPercent: 0 }); },
        });
      });
    }

    render() {
      for (const h in this.handEls) {
        const a = this.state[h];
        const tr = `rotate(${R(a)} 200 200)`;
        this.handEls[h].p.setAttribute('transform', tr);
        this.handEls[h].shadow.setAttribute('transform', `translate(3 5) ${tr}`);
      }
    }

    /* Плавно (или сразу) довести стрелку до угла. ease — по умолчанию с овершутом. */
    to(hand, deg, opt = {}) {
      if (!window.gsap || opt.instant || ST.reduced) { this.state[hand] = deg; this.render(); return null; }
      const p = {}; p[hand] = deg;
      return gsap.to(this.state, Object.assign({ duration: 0.9, ease: 'back.out(1.6)', overwrite: 'auto', onUpdate: () => this.render() }, p, opt.vars || {}));
    }
    setAngle(deg, opt) { return this.to('main', deg, opt); }
    setFraction(f, opt) { return this.to('main', this.ang(f), opt); }
    angleOf(hand = 'main') { return this.state[hand]; }

    /* Свип «на газ»: 0 → максимум → обратно. */
    sweep(back) {
      const [a0, a1] = this.o.arc;
      const hand = this.o.hands.includes('main') ? 'main' : 'hour';
      if (!window.gsap || ST.reduced) return null;
      let ret = typeof back === 'function' ? back() : back ?? this.state[hand];
      let start = a0, top = a1;
      if (a1 - a0 >= 360) {
        // круглый циферблат: «ноль» — ближайший к стрелке, полный оборот вперёд и мягко к текущему времени
        start = Math.round(this.state[hand] / 360) * 360; top = start + 340;
        while (ret < top - 180) ret += 360;
        while (ret > top + 180) ret -= 360;
      }
      const upd = () => this.render();
      const tl = gsap.timeline();
      tl.to(this.state, { [hand]: start, duration: 0.28, ease: 'power2.in', onUpdate: upd })
        .to(this.state, { [hand]: top, duration: 0.55, ease: 'power3.inOut', onUpdate: upd })
        .to(this.state, { [hand]: ret, duration: 0.9, ease: 'back.out(1.4)', onUpdate: upd });
      return tl;
    }

    /* Бегущий блик по хрому */
    glint() {
      if (!this.glintEl || !window.gsap || ST.reduced) return;
      gsap.fromTo(this.glintEl, { rotate: -40, opacity: 0 }, { rotate: 320, opacity: 1, duration: 1.4, ease: 'power2.inOut', onComplete: () => gsap.to(this.glintEl, { opacity: 0, duration: 0.3 }) });
    }
  }

  ST.Gauge = Gauge;
  ST.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Ключ зажигания с эмалевым брелоком ──
     Замок и ключ — вид спереди: ключ поворачивается вокруг центра замка на 90°.
     Брелок висит на кольце в ушке ключа и всегда тянется вниз — качается на пружине
     (от поворота ключа и от скорости карусели). Один rAF-цикл на все ключи, спит, когда всё успокоилось. */
  const keys = new Set();
  let loopOn = false, last = 0;
  function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    let busy = false;
    for (const k of keys) busy = k.step(dt) || busy;
    if (busy) requestAnimationFrame(loop); else loopOn = false;
  }
  function wake() { if (!loopOn) { loopOn = true; last = performance.now(); requestAnimationFrame(loop); } }

  class Ignition {
    constructor(btn, o = {}) {
      const id = 'ig' + ++uid;
      const ring = o.ring || 'ИМЯ — ПРИ ВСТРЕЧЕ ·';
      // брелок крупный: гравировка должна читаться; ремешок — в масштабе замка
      const FS = 2.1, FY = 64 + 24 * FS;
      const center = o.name
        ? `<text class="k-fob-name" x="0" y="4.6" text-anchor="middle">${o.name}</text>`
        : `<text class="k-fob-name" x="0" y="4.2" text-anchor="middle">${o.center || 'ST'}</text>`;
      btn.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 160 236" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F4F2"/><stop offset=".42" stop-color="#A9ABAE"/><stop offset=".62" stop-color="#5E6064"/><stop offset="1" stop-color="#EDEDEA"/></linearGradient>
    <radialGradient id="${id}e" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#FFB27E"/><stop offset=".55" stop-color="#F07A35"/><stop offset="1" stop-color="#B9521D"/></radialGradient>
    <path id="${id}t" d="M0 0m-16.6 0a16.6 16.6 0 1 1 33.2 0a16.6 16.6 0 1 1-33.2 0"/>
  </defs>
  <text class="k-lock-t" x="64" y="9" text-anchor="middle">0</text>
  <text class="k-lock-t" x="132" y="69" text-anchor="middle">ON</text>
  <circle class="k-on" cx="132" cy="82" r="3.5"/>
  <circle cx="64" cy="64" r="47" fill="url(#${id}c)"/>
  <circle cx="64" cy="64" r="40" fill="#151412"/>
  <circle cx="64" cy="64" r="40" fill="none" stroke="rgba(255,255,255,.12)"/>
  <rect x="60" y="44" width="8" height="40" rx="3" fill="#050505"/>
  <g class="k-key">
    <rect x="57" y="40" width="14" height="34" rx="3" fill="url(#${id}c)"/>
    <path d="M46 30a18 18 0 0 1 36 0v10a6 6 0 0 1-6 6H52a6 6 0 0 1-6-6z" fill="#2B2825" stroke="#4a4540"/>
    <path d="M50 32a14 14 0 0 1 28 0" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="64" cy="19" r="5" fill="#151412" stroke="url(#${id}c)" stroke-width="2"/>
  </g>
  <g class="k-fob">
    <circle cx="0" cy="10" r="9" fill="none" stroke="url(#${id}c)" stroke-width="2.4"/>
    <path d="M-4.5 18h9l1 40h-11z" fill="#4A3426"/>
    <path d="M-1.8 22v32" stroke="rgba(255,226,196,.45)" stroke-width=".8" stroke-dasharray="2.2 2.2"/>
    <rect x="-6" y="56" width="12" height="10" rx="2.5" fill="url(#${id}c)"/>
    <g transform="translate(0 ${R(FY)}) scale(${FS})">
      <circle r="24" fill="url(#${id}c)"/>
      <circle r="20.6" fill="url(#${id}e)"/>
      <circle r="20.6" fill="none" stroke="rgba(80,30,6,.35)"/>
      <text class="k-fob-t"><textPath href="#${id}t" startOffset="1">${ring}</textPath></text>
      <circle r="10.2" fill="none" stroke="rgba(255,243,230,.55)" stroke-width=".6"/>
      ${center}
    </g>
  </g>
</svg>`);
      this.btn = btn;
      this.key = btn.querySelector('.k-key');
      this.fob = btn.querySelector('.k-fob');
      this.a = 0; this.target = 0; this.av = 0;   // угол ключа и его скорость
      this.sw = 0; this.sv = 0;                   // угол брелока и его скорость
      this.on = false;
      keys.add(this);
      this.draw();
    }
    set(on) {
      this.on = on; this.target = on ? 90 : 0;
      this.btn.setAttribute('aria-pressed', String(on));
      if (ST.reduced) { this.a = this.target; this.draw(); return; }
      wake();
    }
    toggle() { this.set(!this.on); return this.on; }
    kick(v) { if (ST.reduced) return; this.sv += v; wake(); }
    step(dt) {
      // ключ: пружина с лёгким овершутом
      const ka = 260 * (this.target - this.a) - 22 * this.av;
      this.av += ka * dt; this.a += this.av * dt;
      // брелок: маятник, раскачивается от движения ушка
      const prevHole = this.hole || this.holePos();
      const hole = (this.hole = this.holePos());
      const hx = (hole[0] - prevHole[0]) / dt;
      this.sv += -hx * 0.9 * dt * 60;
      const sa = -46 * this.sw - 3.6 * this.sv;
      this.sv += sa * dt; this.sw += this.sv * dt;
      this.sw = Math.max(-14, Math.min(14, this.sw));
      this.draw();
      return Math.abs(this.target - this.a) > 0.05 || Math.abs(this.av) > 0.05 || Math.abs(this.sw) > 0.05 || Math.abs(this.sv) > 0.05;
    }
    holePos() {
      const r = ((this.a) * Math.PI) / 180;
      // ушко (64,19) вращается вокруг центра замка (64,64)
      return [64 + 45 * Math.sin(r), 64 - 45 * Math.cos(r)];
    }
    draw() {
      this.key.setAttribute('transform', `rotate(${R(this.a)} 64 64)`);
      const [x, y] = this.holePos();
      this.fob.setAttribute('transform', `translate(${R(x)} ${R(y - 3)}) rotate(${R(this.sw)})`);
    }
  }
  ST.Ignition = Ignition;
})();
