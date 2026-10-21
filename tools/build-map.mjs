// Схема центра Казани из геометрии OSM (raw/osm.json): улицы тонкими линиями, Кремлёвская — главная,
// пунктир по Кремлёвской до метро, остановки. Выход: raw/map.svg (вставляется в index.html через tools/inject.mjs).
import fs from 'node:fs';
const ORG = [49.116455, 55.793575];
const METRO = [49.106580479, 55.795922389];
const STOPS = [['КАИ', [49.113604705, 55.797190378]], ['УНИВЕРСИТЕТ', [49.124713106, 55.793110221]]];
const W = 900, H = 620;
const S = 0.56; // px на метр
const kx = Math.cos((ORG[1] * Math.PI) / 180) * 111320 * S, ky = 110540 * S;
const OX = W * 0.64, OY = H * 0.56;
const pr = ([lon, lat]) => [OX + (lon - ORG[0]) * kx, OY - (lat - ORG[1]) * ky];
const r1 = (v) => Math.round(v * 10) / 10;
const path = (pts) => 'M' + pts.map((p) => p.map(r1).join(',')).join('L');
const osm = JSON.parse(fs.readFileSync('raw/osm.json', 'utf8'));
const LABELS = { 'улица Баумана': 'БАУМАНА', 'улица Пушкина': 'ПУШКИНА', 'Университетская улица': 'УНИВЕРСИТЕТСКАЯ' };
const minor = [], major = [], water = [], named = {};
for (const w of osm.elements) {
  const pts = w.geometry.map((g) => pr([g.lon, g.lat]));
  const d = path(pts);
  if (w.tags.natural === 'water' || w.tags.waterway) { water.push(d); continue; }
  const big = /^(primary|secondary)/.test(w.tags.highway);
  (big ? major : minor).push(d);
  if (LABELS[w.tags.name] || w.tags.name === 'Кремлёвская улица') (named[w.tags.name] ||= []).push(pts);
}
// пунктир до метро — по точкам Кремлёвской между метро и прокатом
const [mx] = pr(METRO), [ox] = pr(ORG);
const [m0, o0] = [pr(METRO), pr(ORG)];
const off = (p) => Math.abs((o0[1] - m0[1]) * p[0] - (o0[0] - m0[0]) * p[1] + o0[0] * m0[1] - o0[1] * m0[0]) / Math.hypot(o0[1] - m0[1], o0[0] - m0[0]);
const kr = (named['Кремлёвская улица'] || []).flat().filter((p) => p[0] > mx + 6 && p[0] < ox - 6 && off(p) < 36).sort((a, b) => a[0] - b[0]);
const dedup = kr.filter((p, i) => !i || Math.hypot(p[0] - kr[i - 1][0], p[1] - kr[i - 1][1]) > 6);
const route = path([pr(METRO), ...dedup, pr(ORG)]);
// подпись улицы — по самому длинному видимому отрезку, слева направо
function labelPath(list) {
  let best = null, bl = 0;
  for (const pts of list) {
    const ins = pts.filter((p) => p[0] > 40 && p[0] < W - 40 && p[1] > 40 && p[1] < H - 40);
    const L = ins.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - ins[i - 1][0], p[1] - ins[i - 1][1]) : 0), 0);
    if (L > bl) { bl = L; best = ins; }
  }
  if (!best || bl < 120) return null;
  let pts = best; if (pts[0][0] > pts[pts.length - 1][0]) pts = [...pts].reverse();
  return path(pts);
}
const [px, py] = pr(METRO).map(r1), [qx, qy] = pr(ORG).map(r1);
let svg = `<svg class="map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="map-title" preserveAspectRatio="xMidYMid slice">
  <title id="map-title">Схема: The Scooter Time на Кремлёвской улице, 21; метро «Кремлёвская» — 750 метров по Кремлёвской</title>
  <defs><clipPath id="map-clip"><rect width="${W}" height="${H}"/></clipPath></defs>
  <g clip-path="url(#map-clip)">
    <g class="map-water">${water.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g class="map-minor">${minor.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g class="map-major">${major.map((d) => `<path d="${d}"/>`).join('')}</g>
    <path class="map-route" id="map-route" d="${route}"/>
    <text class="map-label map-label--main" dy="-12"><textPath href="#map-route" startOffset="30%">КРЕМЛЁВСКАЯ</textPath></text>
`;
let i = 0;
for (const [name, list] of Object.entries(named)) {
  if (!LABELS[name]) continue;
  const d = labelPath(list); if (!d) continue;
  svg += `    <path id="map-l${i}" d="${d}" fill="none" stroke="none"/><text class="map-label"><textPath href="#map-l${i}" startOffset="${name.startsWith('Кремл') ? '58%' : '22%'}">${LABELS[name]}</textPath></text>\n`;
  i++;
}
for (const [n, c] of STOPS) {
  const [sx, sy] = pr(c).map(r1);
  const right = sx > W - 170; // у правого края подпись — слева от точки
  svg += `    <g class="map-stop"><circle cx="${sx}" cy="${sy}" r="5"/><text x="${right ? sx - 10 : sx + 10}" y="${sy + 5}"${right ? ' text-anchor="end"' : ''}>${n}</text></g>\n`;
}
svg += `    <g class="map-metro"><circle cx="${px}" cy="${py}" r="11"/><text class="map-m" x="${px}" y="${py + 4.5}">М</text><text x="${px - 4}" y="${py - 18}">«КРЕМЛЁВСКАЯ» · 750 М</text></g>
    <g class="map-org"><circle class="map-ring" cx="${qx}" cy="${qy}" r="16"/><circle class="map-dot" cx="${qx}" cy="${qy}" r="7"/><text x="${qx + 18}" y="${qy + 30}">THE SCOOTER TIME · КРЕМЛЁВСКАЯ, 21</text></g>
  </g>
</svg>`;
fs.writeFileSync('raw/map.svg', svg);
console.log('map', (svg.length / 1024).toFixed(0) + 'КБ', 'minor', minor.length, 'major', major.length, 'water', water.length, 'route pts', dedup.length, 'metro', px, py, 'org', qx, qy);
