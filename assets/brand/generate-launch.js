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
.bg{position:absolute;inset:0;background:radial-gradient(ellipse 50% 60% at 50% 40%,rgba(19,98,59,.7),transparent 70%),radial-gradient(ellipse 120% 50% at 50% 110%,rgba(11,77,46,.6),transparent 60%)}
.bars{position:absolute;left:0;right:0;height:56px;background:#000}.bars.t{top:0}.bars.b{bottom:0}
.grain{position:absolute;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.center{position:absolute;inset:56px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.mark{width:250px;margin-bottom:26px;filter:drop-shadow(0 0 40px rgba(255,255,255,.3))} .mark svg{width:100%;height:auto;display:block}
.kick{font-family:'JetBrains Mono';font-size:17px;letter-spacing:.3em;text-transform:uppercase;color:#8fe3b4;display:flex;align-items:center;gap:14px}
.kick i{width:10px;height:10px;border-radius:50%;background:#8fe3b4;box-shadow:0 0 14px #8fe3b4}
h1{margin-top:18px;font-size:118px;font-weight:800;letter-spacing:-.055em;line-height:.92}
h1 em{font-family:'Instrument Serif';font-style:italic;font-weight:400;letter-spacing:-.01em;font-size:1.06em}
.pills{display:flex;gap:14px;margin-top:38px}
.pill{font-size:19px;font-weight:500;padding:12px 22px;border-radius:999px;border:1px solid rgba(170,255,205,.22);background:rgba(170,255,205,.06);display:flex;gap:10px;align-items:center}
.pill b{font-family:'JetBrains Mono';font-weight:500;color:#fff}
.foot{position:absolute;bottom:80px;left:90px;right:90px;display:flex;justify-content:space-between;font-family:'JetBrains Mono';font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#84a593}
.foot b{color:#fff;font-weight:500}
</style></head><body>${stars(1600,900,800,330,320,23)}<div class="bg"></div>
<div class="center">
  <div class="mark">${logo}</div>
  <div class="kick"><i></i>Now live on Robinhood Chain</div>
  <h1>Degen X <em>has landed.</em></h1>
  <div class="pills"><span class="pill">⚡ <b>~0.4s</b> swaps</span><span class="pill">⛽ Near-zero gas</span><span class="pill">🔑 Non-custodial</span><span class="pill">🐸 Meme coins only</span></div>
</div>
<div class="foot"><span>Fortune favors the bold</span><span><b>degen.website</b></span></div>
<div class="bars t"></div><div class="bars b"></div><div class="grain"></div></body></html>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:2});
await p.setContent(html);await p.waitForTimeout(1500);await p.screenshot({path:'/home/user/baniiii/assets/brand/launch-post.png'});await b.close();})();
