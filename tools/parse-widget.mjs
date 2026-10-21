// Разбор виджета сообщества VK: node raw/parse-widget.mjs raw/vk/widget.html > raw/vk/posts.json
import fs from 'node:fs';
const h = fs.readFileSync(process.argv[2], 'utf8');
const ent = (s) =>
  s
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
// режем по началу поста
const parts = h.split(/(?=<div[^>]+data-post-id=")/).slice(1);
const out = [];
for (const p of parts) {
  const id = (p.match(/data-post-id="([^"]+)"/) || [])[1];
  const date = ent((p.match(/class="wi_date"[^>]*>([\s\S]*?)<\/a>/) || p.match(/class="[^"]*post_date[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span)>/) || [])[1] || '').trim();
  const texts = [...p.matchAll(/class="wall_post_text"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => ent(m[1]).trim()).filter(Boolean);
  const imgs = [...new Set((p.split(String.raw`\/`).join('/').match(/https:\/\/sun[^"' )<>]+userapi\.com[^"' )<>]+/g) || []).map((u) => u.replace(/&amp;/g, '&')))].filter((u) => !/ava=1|camera_/.test(u));
  const video = /video/i.test(p) && /data-video|page_post_thumb_video|VideoPreview/i.test(p);
  out.push({ id, date, text: texts.join('\n---\n'), imgs, video });
}
console.log(JSON.stringify(out, null, 1));
