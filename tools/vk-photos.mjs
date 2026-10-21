// Фото сообщества VK без логина: страница vk.com/photo-<gid>_<id> отдаёт og:image со списком размеров (as=…),
// подставляем максимальный в cs=. Читаем только <head> (поток обрываем после </title>).
//   node tools/vk-photos.mjs scan <from> <to>   — пройти диапазон id, записать найденные в raw/vk/scan.json
//   node tools/vk-photos.mjs get                — скачать всё из raw/vk/scan.json в raw/vk-photos/
import fs from 'node:fs';
const GID = '-29408051';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SCAN = 'raw/vk/scan.json';
const db = fs.existsSync(SCAN) ? JSON.parse(fs.readFileSync(SCAN, 'utf8')) : {};
const save = () => fs.writeFileSync(SCAN, JSON.stringify(db, null, 1));
const dec = new TextDecoder('windows-1251');

async function head(id) {
  const r = await fetch(`https://vk.com/photo${GID}_${id}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru' }, redirect: 'follow' });
  const reader = r.body.getReader(); const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    chunks.push(value); size += value.length;
    const txt = dec.decode(Buffer.concat(chunks));
    if (/<\/title>/.test(txt) || size > 400000) { reader.cancel().catch(() => {}); break; }
  }
  const h = dec.decode(Buffer.concat(chunks)).replace(/&amp;/g, '&');
  const og = h.match(/og:image:secure_url" value="([^"]+)"/)?.[1];
  const title = h.match(/<title>([^<]*)/)?.[1]?.replace(/&#8211;/g, '–');
  const w = h.match(/og:image:width" value="(\d+)/)?.[1], hh = h.match(/og:image:height" value="(\d+)/)?.[1];
  return { status: r.status, url: r.url, og, title, w, h: hh };
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'scan') {
  const ids = a.includes(',') ? a.split(',') : Array.from({ length: Number(b) - Number(a) + 1 }, (_, i) => String(Number(a) + i));
  let found = 0;
  for (const id of ids) {
    if (db[id]) continue;
    try {
      const r = await head(id);
      if (r.og) { db[id] = r; found++; console.log(id, r.title, r.w + 'x' + r.h); save(); }
      else if (/challenge|login|\?u=2/.test(r.url)) { console.log('стоп: VK просит логин/challenge на', id, r.url); break; }
    } catch (e) { console.log('!', id, e.message); }
    await new Promise((res) => setTimeout(res, 250));
  }
  console.log('найдено', found, 'всего в базе', Object.keys(db).length);
}
if (cmd === 'get') {
  fs.mkdirSync('raw/vk-photos', { recursive: true });
  const list = [];
  for (const [id, r] of Object.entries(db).sort()) {
    const u = new URL(r.og);
    const sizes = (u.searchParams.get('as') || '').split(',').filter(Boolean);
    const file = `raw/vk-photos/vk${id}.jpg`;
    let got = fs.existsSync(file) ? 'есть' : '';
    // крупные размеры отдаются не всегда — идём от максимального вниз
    for (const cs of got ? [] : [...sizes].reverse().slice(0, 6)) {
      u.searchParams.set('cs', cs);
      const res = await fetch(u.href, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) }).catch(() => null);
      if (!res?.ok) continue;
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer())); got = cs; break;
    }
    if (!got) { console.log('✗', id); continue; }
    list.push({ id: `vk${id}`, album: /Наши клиенты/.test(r.title) ? 'clients' : 'wall', src: u.href });
    console.log(id, got, r.title.slice(0, 20));
  }
  fs.writeFileSync('raw/vk-photos.json', JSON.stringify(list, null, 1));
}
