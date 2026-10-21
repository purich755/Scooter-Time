// Сборка фото сайта: тёплая единая цветокоррекция, WebP q78 + JPG-фолбэк, несколько ширин.
// Пишет assets/img/<dir>/<name>-<w>.(webp|jpg), js/photos.json (размеры для разметки) и assets/img/SOURCES.md.
//   node tools/build-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const ya = JSON.parse(fs.readFileSync('raw/ya-photos.json', 'utf8'));
const vk = JSON.parse(fs.readFileSync('raw/vk-photos.json', 'utf8'));
const rawPath = (id) => (id.startsWith('ya') ? `raw/ya/${id}.jpg` : `raw/vk-photos/${id}.jpg`);
const srcUrl = (id) => (id.startsWith('ya') ? ya.find((x) => x.id === id).base + 'orig' : vk.find((x) => x.id === id)?.src || '');

// [имя, источник, папка, ширины, crop (доли x,y,w,h) | null, опции]
const PLAN = [
  // hero — золотой час, две девушки на серебристом мопеде
  ['hero', 'ya14', 'city', [720, 1390], null],
  // манифест — серебристый №2 и жёлтая юбка
  ['manifest', 'vk456239288', 'scooters', [480, 768], [0.1, 0, 0.8, 1]],
  // тарифы — пять фонов (размыты: это атмосфера за прибором)
  ['t1', 'ya01', 'city', [960], null, { blur: 1.4 }],
  ['t2', 'vk457239318', 'city', [960], null, { blur: 1.4 }],
  ['t3', 'vk457239299', 'city', [960], null, { blur: 1.2 }],
  ['t4', 'vk456239260', 'city', [960], null, { blur: 1.4 }],
  ['t5', 'vk457239321', 'city', [960], null, { blur: 1.4 }],
  // гараж — разные мопеды
  ['mint', 'ya23', 'scooters', [560, 1100], null],
  ['red', 'ya13', 'scooters', [560, 1100], null],
  ['silver', 'ya05', 'scooters', [560, 1100], null],
  ['blue', 'vk457239344', 'scooters', [560, 1100], null],
  ['orange', 'vk457239398', 'scooters', [560, 1100], [0, 0, 1, 0.75]],
  ['bordo', 'vk456239242', 'scooters', [560, 1100], null],
  ['emerald', 'ya17', 'scooters', [560, 1100], null],
  // открытки
  ['pc-tour', 'ya10', 'clients', [560, 1100], null],
  ['pc-photo', 'vk457239394', 'clients', [560, 1100], null],
  ['pc-romance', 'ya21', 'clients', [560, 1100], null],
  ['pc-gift', 'vk456239285', 'clients', [560, 1100], null],
  // плёнка — клиенты
  ...['ya11', 'ya16', 'ya22', 'ya24', 'vk457239371', 'ya26', 'ya08', 'vk457239392',
    'vk457239316', 'vk457239317', 'vk457239320', 'vk457239322', 'vk457239323', 'vk457239313', 'vk457239307', 'vk457239297']
    .map((id, i) => [`f${String(i + 1).padStart(2, '0')}`, id, 'clients', [440, 1200], null]),
];

const warm = (p) => p.recomb([[1.03, 0.02, 0], [0, 1, 0], [0, 0.02, 0.93]]).modulate({ saturation: 0.92, brightness: 1.0 });

async function load(id, crop) {
  let b = await sharp(rawPath(id)).rotate().toBuffer();
  if (crop) {
    const m = await sharp(b).metadata();
    const [x, y, w, h] = crop;
    b = await sharp(b).extract({ left: Math.round(x * m.width), top: Math.round(y * m.height), width: Math.round(w * m.width), height: Math.round(h * m.height) }).toBuffer();
  }
  return b;
}

const meta = {};
const sources = ['# Источники фото', '', 'Все фото скачаны локально. Яндекс Карты — галерея организации (https://yandex.ru/maps/org/the_scooter_time/241988291495/gallery/). VK — альбомы сообщества https://vk.ru/rent_scooters («Наши клиенты | The Scooter Time», «Фотографии на стене сообщества»).', '', '| Файл | Источник | Оригинал |', '|---|---|---|'];
for (const [name, id, dir, widths, crop, opt = {}] of PLAN) {
  fs.mkdirSync(`assets/img/${dir}`, { recursive: true });
  const base = await load(id, crop);
  const m0 = await sharp(base).metadata();
  const out = [];
  for (const w of widths) {
    const W = Math.min(w, m0.width);
    let p = warm(sharp(base)).resize(W, null, { withoutEnlargement: true });
    if (opt.blur) p = p.blur(opt.blur);
    const pre = await p.toBuffer();
    // WebP на шумных фото бывает тяжелее mozjpeg — понижаем качество, пока не станет легче
    const jpg = await sharp(pre).jpeg({ quality: 76, mozjpeg: true, progressive: true }).toBuffer();
    let q = 78, webp = await sharp(pre).webp({ quality: q, effort: 5 }).toBuffer();
    while (webp.length > jpg.length * 0.95 && q > 60) { q -= 4; webp = await sharp(pre).webp({ quality: q, effort: 5 }).toBuffer(); }
    const mm = await sharp(pre).metadata();
    fs.writeFileSync(`assets/img/${dir}/${name}-${W}.webp`, webp);
    fs.writeFileSync(`assets/img/${dir}/${name}-${W}.jpg`, jpg);
    out.push({ w: W, h: mm.height, webp: Math.round(webp.length / 1024), jpg: Math.round(jpg.length / 1024) });
  }
  meta[name] = { dir, src: id, w: m0.width, h: m0.height, widths: out.map((o) => o.w) };
  sources.push(`| assets/img/${dir}/${name}-*.webp | ${id.startsWith('ya') ? 'Яндекс Карты' : 'VK'} (${id}) | ${srcUrl(id)} |`);
  console.log(name.padEnd(9), id.padEnd(12), out.map((o) => `${o.w}x${o.h} ${o.webp}/${o.jpg}КБ`).join('  '));
}
// Open Graph 1200×630
{
  const b = await load('ya14', null);
  await warm(sharp(b)).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile('assets/img/og.jpg');
  sources.push(`| assets/img/og.jpg | Яндекс Карты (ya14) | ${srcUrl('ya14')} |`);
}
fs.writeFileSync('js/photos.json', JSON.stringify(meta, null, 1));
fs.writeFileSync('assets/img/SOURCES.md', sources.join('\n') + '\n');
console.log('✓', Object.keys(meta).length);
