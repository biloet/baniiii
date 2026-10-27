const { chromium } = require('playwright'); const fs=require('fs');
const logo = fs.readFileSync('/home/user/baniiii/assets/falcon.svg','utf8');
const fonts = `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;700;800&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`;
const stars = (W,H,cx,cy,n,seed) => { let s=seed; const r=()=>((s=(s*9301+49297)%233280)/233280); let out='';
  for(let i=0;i<n;i++){ const a=r()*Math.PI*2, d0=60+r()*Math.max(W,H)*0.7, len=14+r()*120*(d0/700);
    const x1=cx+Math.cos(a)*d0, y1=cy+Math.sin(a)*d0, x2=cx+Math.cos(a)*(d0+len), y2=cy+Math.sin(a)*(d0+len);
    const o=(0.12+r()*0.55).toFixed(2), c=r()<.8?'255,255,255':'143,227,180';
    out+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(${c},${o})" stroke-width="${(0.6+r()*1.8).toFixed(1)}" stroke-linecap="round"/>`; }
  return `<svg width="${W}" height="${H}" style="position:absolute;inset:0">${out}</svg>`; };
const html = `<html><head>${fonts}<style>
*{margin:0;box-sizing:border-box} body{width:1600px;height:900px;overflow:hidden;background:#03140d;font-family:'Inter Tight',sans-serif;color:#e6efe9;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse 45% 55% at 50% 50%,rgba(19,98,59,.75),transparent 70%)}
.bars{position:absolute;left:0;right:0;height:56px;background:#000}.bars.t{top:0}.bars.b{bottom:0}
.grain{position:absolute;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.live{position:absolute;left:50%;top:50%;transform:translate(-50%,-54%);font-size:330px;font-weight:800;letter-spacing:-.06em;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.14),transparent 85%);-webkit-background-clip:text;background-clip:text;white-space:nowrap}
.center{position:absolute;inset:56px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.mark{width:200px;margin-bottom:22px;filter:drop-shadow(0 0 40px rgba(255,255,255,.35))} .mark svg{width:100%;height:auto;display:block}
.badge{display:inline-flex;align-items:center;gap:12px;padding:10px 22px;border-radius:999px;background:#fff;color:#03140d;font-family:'JetBrains Mono';font-weight:500;font-size:18px;letter-spacing:.24em;text-transform:uppercase}
.badge i{width:11px;height:11px;border-radius:50%;background:#e5394f;box-shadow:0 0 0 5px rgba(229,57,79,.2)}
h1{margin-top:26px;font-size:104px;font-weight:800;letter-spacing:-.055em;line-height:.95}
h1 em{font-family:'Instrument Serif';font-style:italic;font-weight:400;letter-spacing:-.01em;font-size:1.06em}
.sub{margin-top:22px;font-size:26px;color:#b3cbbd}
.foot{position:absolute;bottom:80px;left:90px;right:90px;display:flex;justify-content:space-between;font-family:'JetBrains Mono';font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#84a593}
.foot b{color:#fff;font-weight:500}
</style></head><body>${stars(1600,900,800,450,340,41)}<div class="bg"></div><div class="live">LAUNCH</div>
<div class="center">
  <div class="mark">${logo}</div>
  <div class="badge"><i></i>Officially launched</div>
  <h1>Degen X <em>is live.</em></h1>
  <div class="sub">The falcon has landed on Robinhood Chain. Start trading now.</div>
</div>
<div class="foot"><span>Fortune favors the bold</span><span><b>degen.website</b></span></div>
<div class="bars t"></div><div class="bars b"></div><div class="grain"></div></body></html>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:2});
await p.setContent(html);await p.waitForTimeout(1500);await p.screenshot({path:'/home/user/baniiii/assets/brand/launched-post.png'});await b.close();})();
