const { chromium } = require('playwright'); const fs=require('fs');
const logo = fs.readFileSync('/home/user/baniiii/assets/falcon.svg','utf8');
const fonts = `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@700;800&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`;
const stars = (W,H,cx,cy,n,seed) => { let s=seed; const r=()=>((s=(s*9301+49297)%233280)/233280); let out='';
  for(let i=0;i<n;i++){ const a=r()*Math.PI*2, d0=40+r()*Math.max(W,H)*0.6, len=10+r()*90*(d0/600);
    const x1=cx+Math.cos(a)*d0, y1=cy+Math.sin(a)*d0, x2=cx+Math.cos(a)*(d0+len), y2=cy+Math.sin(a)*(d0+len);
    const o=(0.15+r()*0.6).toFixed(2), c=r()<.8?'255,255,255':'143,227,180';
    out+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${c},${o})" stroke-width="${(0.6+r()*1.6).toFixed(1)}" stroke-linecap="round"/>`; }
  return `<svg width="${W}" height="${H}" style="position:absolute;inset:0">${out}</svg>`; };
const base = `*{margin:0;box-sizing:border-box} body{width:var(--w);height:var(--h);overflow:hidden;background:#03140d;font-family:'Inter Tight',sans-serif;color:#e6efe9;position:relative}
.glow{position:absolute;border-radius:50%;filter:blur(30px)}
.grain{position:absolute;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}`;
const profile = `<html><head>${fonts}<style>${base}
.tile{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#13623b 0%,#0b4d2e 38%,#062a19 80%,#03140d 100%)}
.ring{position:absolute;inset:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,.12)}
.mark{position:absolute;left:50%;top:50%;width:268px;transform:translate(-52%,-52%);filter:drop-shadow(0 0 24px rgba(255,255,255,.28)) drop-shadow(0 10px 30px rgba(0,0,0,.5))}
.mark svg{width:100%;height:auto;display:block}
</style></head><body style="--w:400px;--h:400px"><div class="tile"></div>${stars(400,400,200,195,90,7)}<div class="ring"></div><div class="mark">${logo}</div><div class="grain"></div></body></html>`;
const cover = `<html><head>${fonts}<style>${base}
.v{position:absolute;inset:0;background:radial-gradient(ellipse 55% 80% at 70% 50%,rgba(19,98,59,.55),transparent 70%),linear-gradient(90deg,rgba(3,20,13,.92) 0%,rgba(3,20,13,.55) 45%,transparent 70%)}
.copy{position:absolute;left:120px;top:47%;transform:translateY(-50%)}
.kick{font-family:'JetBrains Mono';font-size:15px;letter-spacing:.24em;text-transform:uppercase;color:#8fe3b4;display:flex;align-items:center;gap:12px;margin-bottom:22px}
.kick i{width:9px;height:9px;border-radius:50%;background:#8fe3b4;box-shadow:0 0 12px #8fe3b4}
h1{font-size:84px;font-weight:800;letter-spacing:-.05em;line-height:.9}
h1 em{font-family:'Instrument Serif';font-style:italic;font-weight:400;letter-spacing:-.01em;font-size:1.05em}
.u{display:inline-block;position:relative}.u:after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:3px;border-radius:3px;background:#fff;opacity:.85;transform:rotate(-1deg)}
.brand{margin-top:28px;display:flex;align-items:center;gap:14px;font-size:24px;font-weight:700;letter-spacing:-.02em}
.brand em{font-family:'Instrument Serif';font-weight:400;font-size:1.3em}
.brand .t{width:40px;height:40px;border-radius:11px;background:#0b4d2e;display:grid;place-items:center;border:1px solid rgba(255,255,255,.14)}
.brand .t svg{width:28px;height:auto}
.site{margin-top:26px;font-family:'JetBrains Mono';font-size:16px;letter-spacing:.14em;color:#84a593}
.url{font-family:'JetBrains Mono';font-size:14px;color:#84a593;margin-left:10px;letter-spacing:.06em}
.mark{position:absolute;right:130px;top:50%;width:400px;transform:translateY(-50%);opacity:.95;filter:drop-shadow(0 0 40px rgba(143,227,180,.25))}
.mark svg{width:100%;height:auto;display:block}
</style></head><body style="--w:1500px;--h:500px">${stars(1500,500,1130,250,260,11)}<div class="v"></div>
<div class="mark">${logo}</div>
<div class="copy"><div class="kick"><i></i>Live on Robinhood Chain</div>
<h1>Trade at the<br>speed of <span class="u"><em>conviction.</em></span></h1>
<div class="site">degen.website</div></div>
<div class="grain"></div></body></html>`;
(async()=>{const b=await chromium.launch();
 for (const [html,w,h,name] of [[profile,400,400,'profile'],[cover,1500,500,'cover']]) {
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2}); await p.setContent(html); await p.waitForTimeout(1500);
  await p.screenshot({path:`/home/user/baniiii/assets/brand/${name}.png`});
  if(name==='profile'){ await p.evaluate(()=>{document.body.style.clipPath='circle(50%)';document.documentElement.style.background='#fff'}); await p.screenshot({path:'/dev/null', omitBackground:true}); }
 } await b.close();})();
