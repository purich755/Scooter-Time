// Вырезает круглый логотип из PNG Яндекса (светлый фон вокруг) и меряет фирменный оранжевый.
import sharp from 'sharp';
import fs from 'node:fs';
const src = 'raw/logo/ya-logo.jpg';
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
const dark = ([r, g, b]) => r + g + b < 300;
let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (dark(px(x, y))) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, r = Math.min(maxX - minX, maxY - minY) / 2;
console.log('круг', { minX, maxX, minY, maxY, cx, cy, r });
// оранжевый: пиксели с r>200, g 90..170, b<110
let n = 0, R = 0, G = 0, B = 0; const hist = {};
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  const [rr, gg, bb] = px(x, y);
  if (rr > 200 && gg > 90 && gg < 170 && bb < 110) { n++; R += rr; G += gg; B += bb; const k = `${rr >> 3},${gg >> 3},${bb >> 3}`; hist[k] = (hist[k] || 0) + 1; }
}
const hex = (a) => '#' + a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
console.log('оранжевый средний', hex([R / n, G / n, B / n]), n);
const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [hex(k.split(',').map((x) => x * 8 + 4)), v]);
console.log('мода', top);
// фон круга
const bg = px(Math.round(cx - r * 0.6), Math.round(cy + r * 0.55)); console.log('графит', hex(bg));
// маска-круг с лёгкой внутренней обрезкой (убрать светлый ореол по краю)
const R0 = Math.round(r - 3), S = R0 * 2;
const mask = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${R0}" cy="${R0}" r="${R0}" fill="#fff"/></svg>`);
const cut = await sharp(src).extract({ left: Math.round(cx - R0), top: Math.round(cy - R0), width: S, height: S }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
fs.mkdirSync('assets/img/logo', { recursive: true });
await sharp(cut).resize(512).png({ compressionLevel: 9, palette: false }).toFile('raw/logo/logo-512.png');
await sharp(cut).resize(320).webp({ quality: 90, alphaQuality: 90 }).toFile('assets/img/logo/logo-320.webp');
await sharp(cut).resize(160).webp({ quality: 90, alphaQuality: 90 }).toFile('assets/img/logo/logo-160.webp');
await sharp(cut).resize(320).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile('assets/img/logo/logo-320.png');
await sharp(cut).resize(180).png({ compressionLevel: 9, palette: true }).toFile('assets/apple-touch-icon.png');
await sharp(cut).resize(48).png().toFile('assets/favicon-48.png');
for (const f of fs.readdirSync('assets/img/logo')) console.log(f, (fs.statSync('assets/img/logo/' + f).size / 1024).toFixed(1) + 'КБ');
