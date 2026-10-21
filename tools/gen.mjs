// Генерирует повторяющиеся фрагменты разметки из js/photos.json и вставляет их в index.html
// между маркерами <!--@NAME-->…<!--/@NAME-->. Идемпотентно.   node tools/gen.mjs
import fs from 'node:fs';
const photos = JSON.parse(fs.readFileSync('js/photos.json', 'utf8'));

function pic(name, { sizes, alt, lazy = true }) {
  const m = photos[name];
  if (!m) throw new Error('нет фото ' + name);
  const hh = (w) => Math.round((w * m.h) / m.w);
  const src = (w, ext) => `assets/img/${m.dir}/${name}-${w}.${ext}`;
  const set = (ext) => m.widths.map((w) => `${src(w, ext)} ${w}w`).join(', ');
  const big = m.widths[m.widths.length - 1];
  return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${src(m.widths[0], 'jpg')}" srcset="${set('jpg')}" sizes="${sizes}" width="${big}" height="${hh(big)}" alt="${alt}"${lazy ? ' loading="lazy"' : ''} decoding="async"></picture>`;
}
function full(name) {
  const m = photos[name];
  const big = m.widths[m.widths.length - 1];
  return `data-full="assets/img/${m.dir}/${name}-${big}.webp" data-full-jpg="assets/img/${m.dir}/${name}-${big}.jpg" data-w="${big}" data-h="${Math.round((big * m.h) / m.w)}"`;
}
const esc = (s) => s.replace(/"/g, '&quot;');

/* ── Гараж ── */
const GARAGE = [
  ['mint', 'МЯТНЫЙ', '#8FD6C2', 'Мятный ретро-мопед на улице в центре Казани'],
  ['red', 'КРАСНЫЙ', '#C2302A', 'Красно-кремовый ретро-мопед на солнечной улице'],
  ['silver', 'СЕРЕБРИСТЫЙ', '#BFC2C6', 'Серебристый ретро-мопед и девушка в соломенной шляпе'],
  ['blue', 'СИНИЙ', '#2D4FA8', 'Синий ретро-мопед на тротуаре в центре'],
  ['orange', 'ОРАНЖЕВЫЙ', '#F07A2A', 'Оранжевый ретро-мопед крупным планом'],
  ['bordo', 'БОРДОВЫЙ', '#7E2230', 'Бордовый ретро-мопед у стены с тропическим граффити'],
  ['emerald', 'ИЗУМРУДНЫЙ', '#2E8C6E', 'Изумрудный ретро-мопед в сквере'],
];
const garage = GARAGE.map(([img, color, sw, alt], i) => {
  const low = color.toLowerCase();
  return `          <li class="car${img === 'red' ? ' car--cherry' : ''}" style="--sw:${sw}" data-car="${i}">
            <button class="car-photo" type="button" data-lb="garage" ${full(img)} aria-label="Открыть фото: ${low} мопед" data-cursor="СМОТРЕТЬ">
              ${pic(img, { sizes: '(min-width: 768px) 340px, 72vw', alt: esc(alt) })}
              <span class="car-lamp" aria-hidden="true"></span>
              <span class="car-on" aria-hidden="true">ON</span>
            </button>
            <div class="car-meta">
              <p class="car-color"><i aria-hidden="true"></i>${color}</p>
              <button class="car-key" type="button" aria-pressed="false" aria-label="Повернуть ключ: ${low} мопед, имя — при встрече" data-key><span class="car-key-fb">ИМЯ — ПРИ ВСТРЕЧЕ</span></button>
              <p class="hand-note car-note">у каждого своё, честно</p>
            </div>
          </li>`;
}).join('\n');

/* ── Тарифы: фоны и кнопки ── */
const tfbg = ['t1', 't2', 't3', 't4', 't5'].map((n, i) => {
  const m = photos[n]; const w = m.widths[0];
  return `        <picture class="tf-bgi${i === 0 ? ' is-on' : ''}" data-bg="${i}"><source type="image/webp" data-srcset="assets/img/${m.dir}/${n}-${w}.webp"><img data-src="assets/img/${m.dir}/${n}-${w}.jpg" width="${w}" height="${Math.round((w * m.h) / m.w)}" alt="" decoding="async"></picture>`;
}).join('\n');
const TF = [['1 Ч', '1&nbsp;000&nbsp;₽'], ['2 Ч', '1&nbsp;700&nbsp;₽'], ['3 Ч', '2&nbsp;500&nbsp;₽'], ['4 Ч', '3&nbsp;200&nbsp;₽'], ['НОЧЬ', '22–10']];
const chips = TF.map(([h, p], i) => `            <button class="tf-chip" type="button" data-tf="${i}" aria-pressed="${i === 0}"><b>${h}</b><span>${p}</span></button>`).join('\n');

/* ── Открытки ── */
const CARDS = [
  ['pc-tour', 'Экскурсии по Казани', 'Город с&nbsp;седла: центр, набережные, виды.', 'Казань — с ветерком!', 'КАЗАНЬ', 'Четверо друзей на ретро-мопедах на улице Казани'],
  ['pc-photo', 'Выездные фотосессии', 'Ретро-скутер, город и&nbsp;вы в&nbsp;кадре.', 'Улыбнитесь, вы в кадре', 'ОТ 2&nbsp;000&nbsp;₽', 'Жених и невеста на красном ретро-мопеде у белого особняка'],
  ['pc-romance', 'Романтические прогулки', 'Вдвоём, на&nbsp;одном мопеде, без спешки.', 'Держись крепче', 'ВДВОЁМ', 'Пара на мятном ретро-мопеде едет по пустой улице'],
  ['pc-gift', 'Подарочные сертификаты', 'Подарите не&nbsp;вещь — подарите время.', 'Тебе — целый час свободы', 'ОТ 1&nbsp;000&nbsp;₽', 'Пара на ретро-мопеде у набережной раскинула руки'],
];
const cards = CARDS.map(([img, t, text, msg, stamp, alt], i) => `          <li class="pc" data-pc="${i}">
            <article class="pc-in" aria-labelledby="pc${i}-t">
              <div class="pc-photo">${pic(img, { sizes: '(min-width: 1024px) 230px, 40vw', alt: esc(alt) })}</div>
              <div class="pc-side">
                <div class="pc-stamp" aria-hidden="true"><img src="assets/img/logo/logo-160.webp" width="160" height="160" alt="" loading="lazy"><span>${stamp}</span></div>
                <svg class="pc-mark" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="pcm${i}" d="M60 60m-40 0a40 40 0 1 1 80 0a40 40 0 1 1-80 0"/></defs><circle cx="60" cy="60" r="50"/><circle cx="60" cy="60" r="30"/><text><textPath href="#pcm${i}">THE SCOOTER TIME · КАЗАНЬ ·</textPath></text><text class="pc-mark-c" x="60" y="66" text-anchor="middle">ST</text><path class="pc-wave" d="M-70 44c10-6 20 6 30 0s20 6 30 0 20 6 30 0M-70 60c10-6 20 6 30 0s20 6 30 0 20 6 30 0M-70 76c10-6 20 6 30 0s20 6 30 0 20 6 30 0"/></svg>
                <p class="pc-kind">ПОЧТОВАЯ КАРТОЧКА</p>
                <h3 class="pc-t" id="pc${i}-t">${t}</h3>
                <p class="pc-text">${text}</p>
                <p class="hand-note pc-msg">${msg}</p>
                <div class="pc-lines" aria-hidden="true"><i></i><i></i></div>
                <a class="pc-link" href="tel:+78432165290">Спросить по&nbsp;телефону <svg class="ic"><use href="#i-arrow"/></svg></a>
              </div>
            </article>
          </li>`).join('\n');

/* ── Плёнка ── */
const FILM = [
  ['f01', 'Пара на мятном мопеде у фонаря с цветами'],
  ['f02', 'Пара на красном мопеде на улице в центре'],
  ['f03', 'Друзья на красном и серебристом мопедах у кафе'],
  ['f04', 'Двое в шлемах на серебристом и красном мопедах'],
  ['f05', 'Парень на серебристом мопеде на улице'],
  ['f06', 'Двое на красном и серебристом мопедах'],
  ['f07', 'Двое у изумрудного и красного мопедов'],
  ['f08', 'Двое на мятном мопеде у кафе'],
  ['f09', 'Пара у красного мопеда в парке'],
  ['f10', 'Пара на серебристом мопеде в парке'],
  ['f11', 'Пара на изумрудном мопеде в парке'],
  ['f12', 'Двое на красном мопеде в парке'],
  ['f13', 'Парень на красном мопеде с включённой фарой'],
  ['f14', 'Девушка на бордовом мопеде у граффити'],
  ['f15', 'Парень на бордовом мопеде у бирюзовой стены'],
  ['f16', 'Двое на изумрудном мопеде в парке'],
];
const MARKS = {
  f04: ['circle', 'этот!'],
  f09: ['circle', 'лучший кадр'],
  f13: ['arrow', 'фара горит'],
  f16: ['circle', 'в рамку!'],
};
const markSvg = (kind) => kind === 'circle'
  ? '<svg class="fr-mark" viewBox="0 0 200 260" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M108 14C52 10 14 52 12 118c-2 70 34 126 96 128 58 2 84-52 82-116C188 66 156 18 96 20 70 22 50 34 40 46"/></svg>'
  : '<svg class="fr-mark" viewBox="0 0 200 260" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M176 232C150 196 128 170 96 150M96 150l6 26M96 150l26-2"/></svg>';
let no = 11;
const frame = ([n, alt], i) => {
  no++;
  const mk = MARKS[n];
  return `          <li class="fr">
            <span class="fr-top" aria-hidden="true">${i % 3 === 0 ? 'SCOOTER TIME 400' : ''}</span>
            <button class="fr-btn" type="button" data-lb="film" ${full(n)} aria-label="Открыть кадр: ${alt.toLowerCase()}" data-cursor="СМОТРЕТЬ">${pic(n, { sizes: '(min-width: 768px) 220px, 46vw', alt })}</button>
            ${mk ? markSvg(mk[0]) + `<span class="hand-note fr-note" aria-hidden="true">${mk[1]}</span>` : ''}
            <span class="fr-no" aria-hidden="true"><b>${no}</b><b>▸ ${no}A</b></span>
          </li>`;
};
const film = `      <div class="strip strip--a" data-strip="1"><ul class="strip-track">
${FILM.slice(0, 8).map(frame).join('\n')}
      </ul></div>
      <div class="strip strip--b" data-strip="-1"><ul class="strip-track">
${FILM.slice(8).map((f, i) => frame(f, i + 8)).join('\n')}
      </ul></div>`;

const map = fs.readFileSync('raw/map.svg', 'utf8');

let html = fs.readFileSync('index.html', 'utf8');
for (const [k, v] of Object.entries({ GARAGE: garage, TFBG: tfbg, TFCHIPS: chips, CARDS: cards, FILM: film, MAP: map })) {
  const re = new RegExp(`<!--@${k}-->[\\s\\S]*?<!--/@${k}-->`);
  if (!re.test(html)) { console.log('нет маркера', k); continue; }
  html = html.replace(re, () => `<!--@${k}-->\n${v}\n<!--/@${k}-->`);
}
fs.writeFileSync('index.html', html);
console.log('✓ index.html', (html.length / 1024).toFixed(0) + 'КБ');
