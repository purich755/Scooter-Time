// Лист кандидатов с сеткой 10%: node tools/grid-sheet.mjs out.jpg file1 file2 ...
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2);
const H = 520; const tiles = []; let x = 0;
for (const f of files) {
  const b = await sharp(f).rotate().resize(null, H).toBuffer();
  const { width: w } = await sharp(b).metadata();
  let lines = '';
  for (let i = 1; i < 10; i++) {
    lines += `<line x1="${(w * i) / 10}" y1="0" x2="${(w * i) / 10}" y2="${H}" stroke="#0ff" stroke-opacity=".45" stroke-width="${i === 5 ? 2 : 1}"/>`;
    lines += `<line x1="0" y1="${(H * i) / 10}" x2="${w}" y2="${(H * i) / 10}" stroke="#0ff" stroke-opacity=".45" stroke-width="${i === 5 ? 2 : 1}"/>`;
  }
  const name = f.split('/').pop().replace('.jpg', '');
  const svg = Buffer.from(`<svg width="${w}" height="${H}">${lines}<rect width="${w}" height="26" fill="#000" fill-opacity=".6"/><text x="6" y="19" fill="#fff" font-size="17" font-family="Arial">${name}</text></svg>`);
  tiles.push({ input: await sharp(b).composite([{ input: svg }]).toBuffer(), left: x, top: 0 });
  x += w + 6;
}
await sharp({ create: { width: x, height: H, channels: 3, background: '#111' } }).composite(tiles).jpeg({ quality: 80 }).toFile(out);
console.log(out, x);
