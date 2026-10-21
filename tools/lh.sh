#!/bin/sh
# Lighthouse (мобильный) против прод-сервера: sh tools/lh.sh [url]
U=${1:-http://localhost:8216/}
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npx -y lighthouse@12 "$U" --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=raw/lh.json --chrome-flags="--headless=new" --quiet >/dev/null 2>&1
node -e '
const r=require("./raw/lh.json");for(const [k,c] of Object.entries(r.categories))console.log(k,Math.round(c.score*100));
for(const id of ["largest-contentful-paint","first-contentful-paint","total-blocking-time","cumulative-layout-shift","speed-index"])console.log(id,r.audits[id].displayValue);
const e=r.audits["largest-contentful-paint-element"].details?.items?.[0]?.items?.[0]?.node;console.log("LCP:",e?.selector,e?.nodeLabel);
for(const a of Object.values(r.audits)) if(a.score!==null&&a.score<0.9&&!["informative","notApplicable","manual"].includes(a.scoreDisplayMode)) console.log(" -",a.id,a.score,a.displayValue||"");'
