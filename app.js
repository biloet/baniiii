/* Degen X — front-end logic (vanilla JS, no build step) */
(() => {
  "use strict";

  // Network config. Robinhood Chain testnet; update when mainnet params are published.
  const CHAIN = {
    chainId: "0xb626", // 46630
    chainName: "Robinhood Chain Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
    blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"],
  };

  // Router address is not set yet: swaps run in demo mode until it is.
  const ROUTER_ADDRESS = null;

  // Indicative prices (USD). Replace with an on-chain / API price feed.
  // `meme: true` marks Robinhood Chain meme coins, which drive the markets table, ticker and top mover.
  const TOKENS = [
    { sym: "ETH", name: "Ether", price: 3842.15, chg: 2.41, vol: 18.4e6, liq: 96.2e6, color: "#9fb4ff" },
    { sym: "USDC", name: "USD Coin", price: 1.0, chg: 0.01, vol: 12.1e6, liq: 84.5e6, color: "#5aa2ff" },
    { sym: "DEGEN", name: "Degen X", price: 0.4821, chg: 18.73, vol: 6.9e6, liq: 21.3e6, color: "#0b4d2e", ink: "#ffffff" },
    // Robinhood Chain meme coins
    { sym: "CASHCAT", name: "Cash Cat", price: 0.2041, chg: 12.4, vol: 9.8e6, liq: 14.2e6, color: "#f5d36b", meme: true },
    { sym: "AI", name: "Artificial Inu", price: 0.2815, chg: 6.2, vol: 7.4e6, liq: 18.6e6, color: "#b7f0d0", meme: true },
    { sym: "STONK", name: "StonkBroker", price: 0.0482, chg: -3.9, vol: 3.1e6, liq: 5.2e6, color: "#8fe3b4", meme: true },
    { sym: "JOHN", name: "Little John", price: 0.0217, chg: 21.6, vol: 2.6e6, liq: 3.4e6, color: "#d9c6a0", meme: true },
    { sym: "DIH", name: "Dog in Hood", price: 0.0136, chg: 33.1, vol: 2.2e6, liq: 2.1e6, color: "#e8b48a", meme: true },
    { sym: "TENDIES", name: "Tendies", price: 0.0093, chg: 4.8, vol: 1.9e6, liq: 2.8e6, color: "#ffc477", meme: true },
    { sym: "CASHDOG", name: "Cash Dog in Hood", price: 0.0068, chg: -8.2, vol: 1.2e6, liq: 1.6e6, color: "#c9e7a6", meme: true },
    { sym: "PIPEDOG", name: "Pipedog", price: 0.0041, chg: -2.7, vol: 0.9e6, liq: 1.3e6, color: "#a8d8ea", meme: true },
    { sym: "HOODDOG", name: "HoodDog", price: 0.0029, chg: 9.6, vol: 0.7e6, liq: 1.0e6, color: "#e2e6e4", meme: true },
    { sym: "YOLO", name: "Yolo", price: 0.0012, chg: -12.4, vol: 0.5e6, liq: 0.8e6, color: "#ff9db0", meme: true },
    { sym: "HMM", name: "Thinking Cat", price: 0.00074, chg: 2.1, vol: 0.4e6, liq: 0.6e6, color: "#d7c4f2", meme: true },
  ];
  const bySym = Object.fromEntries(TOKENS.map((t) => [t.sym, t]));

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  const state = {
    from: "ETH",
    to: "DEGEN",
    slippage: 0.5,
    account: null,
    chainId: null,
    nativeBalance: null,
    pickingSide: null,
    tf: "1D",
  };

  /* ---------- formatting ---------- */
  const fmtUsd = (n) => {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n.toFixed(2);
  };
  const fmtPrice = (n) => {
    if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (n >= 1) return "$" + n.toFixed(2);
    if (n >= 0.01) return "$" + n.toFixed(4);
    return "$" + n.toPrecision(3);
  };
  const fmtNum = (n) => {
    if (!isFinite(n) || n === 0) return "0";
    if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toPrecision(4);
  };
  const fmtAmt = (n) => {
    if (!isFinite(n) || n === 0) return "";
    if (n >= 1e6) return n.toFixed(0);
    if (n >= 1000) return String(+n.toFixed(2));
    if (n >= 1) return String(+n.toFixed(4));
    return n.toPrecision(5).replace(/0+$/, "").replace(/\.$/, "");
  };
  const fmtUsdExact = (n) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);

  // Token artwork lives in assets/tokens/<symbol>.svg; drop an official logo in with the same name to replace it.
  const localLogo = (t) => (t.sym === "DEGEN" ? "assets/logo.svg" : `assets/tokens/${t.sym.toLowerCase()}.svg`);
  const logoFor = (t) => t.logo || localLogo(t);
  const icon = (t) =>
    `<img class="tk-icon" src="${logoFor(t)}" alt="" referrerpolicy="no-referrer" style="background:${t.color}" onerror="this.onerror=null;this.src='${localLogo(t)}'" />`;

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
  }

  /* ---------- intro ---------- */
  function runIntro() {
    const intro = $("#intro");
    const count = $("#introCount");
    const finish = () => {
      intro.classList.add("done");
      document.body.classList.remove("is-loading");
      document.body.classList.add("ready");
      startCounters();
      setTimeout(() => intro.classList.add("gone"), 1200);
    };
    if (reduceMotion) return finish();
    const t0 = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      count.textContent = String(Math.round((1 - Math.pow(1 - p, 2)) * 100)).padStart(2, "0");
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finish, 180);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- hero warp field ---------- */
  function initWarp() {
    const canvas = $("#warp");
    const ctx = canvas.getContext("2d");
    const N = innerWidth < 700 ? 420 : 900;
    const stars = [];
    let w, h, cx, cy, dpr;
    let mx = 0, my = 0, tx = 0, ty = 0;
    let speed = 1, targetSpeed = 1;
    let visible = true;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w * (innerWidth > 900 ? 0.62 : 0.5); cy = h * 0.42;
    };
    const spawn = (s, far) => {
      s.x = (Math.random() - 0.5) * 2;
      s.y = (Math.random() - 0.5) * 2;
      s.z = far ? 1 : Math.random();
      s.pz = s.z;
      s.hue = Math.random() < 0.82 ? 0 : 1;
      return s;
    };
    for (let i = 0; i < N; i++) stars.push(spawn({}, false));

    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    $(".hero").addEventListener("pointerdown", () => (targetSpeed = 6));
    addEventListener("pointerup", () => (targetSpeed = 1));
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

    const draw = (static_) => {
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      speed += (targetSpeed - speed) * 0.05;
      const ox = cx - mx * 40, oy = cy - my * 30;

      ctx.fillStyle = static_ ? "#03140d" : "rgba(3,20,13,0.32)";
      ctx.fillRect(0, 0, w, h);

      // horizon glow
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(w, h) * 0.55);
      g.addColorStop(0, "rgba(255,255,255,0.07)");
      g.addColorStop(0.35, "rgba(143,227,180,0.035)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const scale = Math.max(w, h) * 0.5;
      const v = 0.0035 * speed;
      for (const s of stars) {
        s.pz = s.z;
        if (!static_) s.z -= v;
        if (s.z <= 0.02) { spawn(s, true); continue; }
        const sx = ox + (s.x / s.z) * scale;
        const sy = oy + (s.y / s.z) * scale;
        const px = ox + (s.x / s.pz) * scale;
        const py = oy + (s.y / s.pz) * scale;
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) { spawn(s, true); continue; }
        const a = Math.min(1, (1 - s.z) * 1.4);
        ctx.strokeStyle = s.hue ? `rgba(143,227,180,${a})` : `rgba(255,255,255,${a})`;
        ctx.lineWidth = (1 - s.z) * 2.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(static_ ? sx + 0.5 : sx, sy);
        ctx.stroke();
      }
    };

    if (reduceMotion) { draw(true); return; }
    const loop = () => {
      if (visible && !document.hidden) draw(false);
      requestAnimationFrame(loop);
    };
    ctx.fillStyle = "#03140d"; ctx.fillRect(0, 0, w, h);
    loop();
  }

  /* ---------- hero rotating word ---------- */
  function initRotator() {
    const box = $("#rotator");
    const el = $("#rotWord");
    const line = $("#scribble");
    line.setAttribute("pathLength", "1");
    const WORDS = ["conviction.", "instinct.", "thought.", "light.", "degens."];
    let idx = 0;

    const split = (word, cls) =>
      [...word].map((c, i) => `<span class="ch ${cls}" style="--c:${i}">${c}</span>`).join("");
    const measure = (word) => {
      const probe = el.cloneNode();
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
      probe.textContent = word;
      box.appendChild(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    };
    const drawLine = () => {
      line.classList.remove("draw");
      void line.getBoundingClientRect();
      line.classList.add("draw");
    };

    el.innerHTML = split(WORDS[0], "");
    box.style.width = measure(WORDS[0]) + "px";
    setTimeout(drawLine, 900);
    const remeasure = () => (box.style.width = measure(WORDS[idx]) + "px");
    addEventListener("resize", remeasure);
    if (document.fonts) document.fonts.ready.then(remeasure);
    if (reduceMotion) return;

    const swap = () => {
      setTimeout(swap, 3400);
      if (document.hidden) return;
      $$(".ch", el).forEach((c) => c.classList.add("out"));
      line.classList.remove("draw");
      idx = (idx + 1) % WORDS.length;
      const next = WORDS[idx];
      setTimeout(() => {
        box.style.width = measure(next) + "px";
        el.innerHTML = split(next, "pre");
        void el.offsetWidth;
        $$(".ch", el).forEach((c) => c.classList.remove("pre"));
        drawLine();
      }, 520);
    };
    // let the intro and the first word breathe before cycling
    setTimeout(swap, 5200);
  }

  /* ---------- live network status ---------- */
  function initNetStatus() {
    const rpc = CHAIN.rpcUrls[0];
    let id = 0, lastBlock = 0;
    const call = (method) =>
      fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params: [] }),
      }).then((r) => r.json()).then((j) => {
        if (!j || !j.result) throw new Error("rpc");
        return parseInt(j.result, 16);
      });

    const poll = async () => {
      try {
        const [block, gas] = await Promise.all([call("eth_blockNumber"), call("eth_gasPrice")]);
        const b = $("#blockNum");
        b.textContent = "#" + block.toLocaleString("en-US");
        if (lastBlock && block > lastBlock) {
          b.classList.add("tick-up");
          setTimeout(() => b.classList.remove("tick-up"), 600);
        }
        lastBlock = block;
        const gwei = gas / 1e9;
        $("#gasPrice").textContent = (gwei < 0.01 ? "<0.01" : gwei.toFixed(gwei < 1 ? 3 : 1)) + " gwei";
        $("#stBlock").hidden = false;
        $("#stGas").hidden = false;
        setTimeout(poll, 4000);
      } catch {
        // RPC unreachable (offline, CORS, rate limit): keep the network badge only, retry slowly
        setTimeout(poll, 30000);
      }
    };
    poll();
  }

  /* ---------- hero product cards ---------- */
  function renderHeroVisual() {
    const t = bySym.DEGEN;
    $("#hvIcons").innerHTML = icon(t);
    $("#hvPrice").textContent = fmtPrice(t.price);
    const chg = $("#hvChg");
    chg.textContent = fmtPct(t.chg);
    chg.style.color = t.chg >= 0 ? "var(--up)" : "var(--down)";
    $("#hvVol").textContent = fmtUsd(t.vol);
    $("#hvLiq").textContent = fmtUsd(t.liq);
    const s = seriesFor(t, bySym.USDC, "1D");
    const min = Math.min(...s), max = Math.max(...s);
    const pts = s.map((v, i) => [(i / (s.length - 1)) * 300, 76 - ((v - min) / (max - min || 1)) * 68]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    $("#hvLine").setAttribute("d", line);
    $("#hvArea").setAttribute("d", line + " L300,80 L0,80 Z");
  }

  function renderTopMover() {
    const t = TOKENS.filter((x) => x.meme).reduce((a, b) => (b.chg > a.chg ? b : a));
    $("#topMover").innerHTML = `${icon(t)}<b>${t.sym}</b><span class="${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</span>`;
  }

  function initHeroVisual() {
    renderHeroVisual();
    renderTopMover();
    if (!finePointer || reduceMotion) return;
    const cards = $$("#heroVisual .hv-card");
    let tx = 0, ty = 0, x = 0, y = 0;
    addEventListener("pointermove", (e) => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
    const loop = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      if (document.body.classList.contains("ready") && scrollY < innerHeight) {
        cards.forEach((c) => {
          const d = parseFloat(c.dataset.depth);
          c.style.transform = `translate3d(${-x * d * 14}px, ${-y * d * 12}px, 0) rotateX(${y * 4}deg) rotateY(${-x * 6}deg)`;
        });
      }
      requestAnimationFrame(loop);
    };
    // wait for the entrance transition before taking over transform
    setTimeout(() => {
      cards.forEach((c) => (c.style.transition = "opacity 1.2s var(--ease)"));
      loop();
    }, 2600);
  }

  /* ---------- features: latency stopwatch ---------- */
  function initStopwatch() {
    const el = $("#swTime");
    if (reduceMotion) { el.textContent = "0.40"; return; }
    // count up to the median fill, hold, repeat (in step with the race bars' 4s loop)
    let t0 = performance.now();
    const tick = (now) => {
      const t = ((now - t0) / 1000) % 4;
      el.textContent = Math.min(t, 0.4).toFixed(2);
      requestAnimationFrame(tick);
    };
    const io2 = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io2.disconnect();
      t0 = performance.now();
      requestAnimationFrame(tick);
    });
    io2.observe(el);
  }

  /* ---------- nav ---------- */
  const nav = $("#nav");
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 20);
    const menuOpen = $("#navLinks").classList.contains("open");
    nav.classList.toggle("hide", !menuOpen && y > 600 && y > lastY + 4);
    if (y < lastY - 4) nav.classList.remove("hide");
    lastY = y;
  }, { passive: true });

  const menuBtn = $("#menuBtn");
  const navLinks = $("#navLinks");
  menuBtn.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", navLinks).forEach((a) => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));

  $$("[data-soon]").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    toast("Coming soon.");
  }));

  /* ---------- cursor glow + card spotlight ---------- */
  if (finePointer && !reduceMotion) {
    const glow = $("#cursorGlow");
    let gx = -999, gy = -999, cx = gx, cy = gy;
    addEventListener("pointermove", (e) => { gx = e.clientX; gy = e.clientY; }, { passive: true });
    const follow = () => {
      cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12;
      glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(follow);
    };
    follow();

    $$(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    });
  }

  /* ---------- manifesto: words light up on scroll ---------- */
  function initManifesto() {
    const el = $("#manifestoText");
    const highlight = new Set(["first", "one", "signature", "trade."]);
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map((w) => `<span class="w${highlight.has(w.toLowerCase()) ? " hl" : ""}">${w}</span>`)
      .join(" ");
    const words = $$(".w", el);
    const update = () => {
      const r = el.getBoundingClientRect();
      const start = innerHeight * 0.85, end = innerHeight * 0.35;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.6)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    };
    if (reduceMotion) return words.forEach((w) => w.classList.add("on"));
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- swap ---------- */
  const amountIn = $("#amountIn");
  const amountOut = $("#amountOut");
  const swapBtn = $("#swapBtn");
  const FEE = 0.0025;

  function renderTokenButtons() {
    $$(".token-btn").forEach((b) => {
      const t = bySym[state[b.dataset.side]];
      b.innerHTML = icon(t) + `<span>${t.sym}</span>`;
    });
  }

  function quote() {
    const a = parseFloat(amountIn.value);
    const from = bySym[state.from];
    const to = bySym[state.to];
    const valid = isFinite(a) && a > 0;
    const usd = valid ? a * from.price : 0;

    // constant-product style price impact against the output pool's liquidity
    const impact = valid ? (usd / (to.liq / 2 + usd)) * 100 : 0;
    const out = valid ? (usd * (1 - FEE) * (1 - impact / 100)) / to.price : 0;

    amountOut.value = valid ? fmtAmt(out) : "";
    $("#usdIn").textContent = fmtUsdExact(usd);
    $("#usdOut").textContent = fmtUsdExact(out * to.price);

    const q = $("#quote");
    q.hidden = !valid;
    if (valid) {
      $("#qRate").textContent = `1 ${from.sym} = ${fmtNum(from.price / to.price)} ${to.sym}`;
      const imp = $("#qImpact");
      imp.textContent = impact < 0.01 ? "<0.01%" : impact.toFixed(2) + "%";
      imp.classList.toggle("warn", impact > 3);
      $("#qMin").textContent = `${fmtNum(out * (1 - state.slippage / 100))} ${to.sym}`;
      const direct = [from.sym, to.sym].some((s) => s === "ETH" || s === "USDC");
      $("#qRoute").textContent = direct ? `${from.sym} → ${to.sym}` : `${from.sym} → ETH → ${to.sym}`;
    }
    updateSwapButton(valid, a);
  }

  function updateSwapButton(valid, a) {
    const onChain = state.chainId === CHAIN.chainId;
    let label = "Swap";
    let disabled = false;
    if (!state.account) label = "Connect wallet";
    else if (!onChain) label = "Switch to Robinhood Chain";
    else if (!valid) { label = "Enter an amount"; disabled = true; }
    else if (state.from === "ETH" && state.nativeBalance !== null && a > state.nativeBalance) {
      label = "Insufficient ETH balance"; disabled = true;
    }
    swapBtn.textContent = label;
    swapBtn.disabled = disabled;
  }

  function pairChanged() {
    renderTokenButtons();
    renderBalances();
    quote();
    renderChart(true);
  }

  amountIn.addEventListener("input", () => {
    let v = amountIn.value.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    amountIn.value = v;
    quote();
  });

  $("#flipBtn").addEventListener("click", () => {
    [state.from, state.to] = [state.to, state.from];
    if (amountOut.value) amountIn.value = amountOut.value;
    pairChanged();
  });

  $$(".quick button").forEach((b) => b.addEventListener("click", () => {
    if (state.from !== "ETH" || state.nativeBalance === null) {
      toast(state.account ? "Token balances are not available yet." : "Connect your wallet first.");
      return;
    }
    const pct = parseFloat(b.dataset.pct);
    // leave a little ETH for gas when using MAX
    const amt = Math.max(0, state.nativeBalance * pct - (pct === 1 ? 0.0005 : 0));
    amountIn.value = fmtAmt(amt) || "0";
    quote();
  }));

  $("#settingsBtn").addEventListener("click", () => {
    const s = $("#settings");
    s.hidden = !s.hidden;
  });
  $$("[data-slip]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-slip]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    $("#slipCustom").value = "";
    state.slippage = parseFloat(b.dataset.slip);
    quote();
  }));
  $("#slipCustom").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    if (isFinite(v) && v > 0 && v <= 50) {
      $$("[data-slip]").forEach((x) => x.classList.remove("active"));
      state.slippage = v;
      quote();
    }
  });

  $("#swapForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.account) return connect();
    if (state.chainId !== CHAIN.chainId) return switchChain();
    if (!ROUTER_ADDRESS) toast("Demo mode: the router contract isn't deployed yet. No transaction was sent.");
  });

  /* ---------- token modal ---------- */
  const modal = $("#tokenModal");
  const tokenSearch = $("#tokenSearch");

  function renderTokenList(filter = "") {
    const f = filter.trim().toLowerCase();
    const current = state[state.pickingSide];
    const list = TOKENS.filter((t) => !f || t.sym.toLowerCase().includes(f) || t.name.toLowerCase().includes(f));
    $("#tokenList").innerHTML = list.length
      ? list.map((t) => `<li><button type="button" data-sym="${t.sym}" ${t.sym === current ? "disabled" : ""}>
            ${icon(t)}<span><b>${t.sym}</b><small>${t.name}</small></span>
            <span class="px">${fmtPrice(t.price)}<small class="${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</small></span>
          </button></li>`).join("")
      : `<li class="muted" style="padding:24px;text-align:center">No tokens found</li>`;
    $("#tokenChips").innerHTML = ["ETH", "USDC", "DEGEN", "CASHCAT"]
      .filter((s) => s !== current)
      .map((s) => `<button type="button" data-sym="${s}">${icon(bySym[s])}${s}</button>`)
      .join("");
  }

  function openPicker(side) {
    state.pickingSide = side;
    tokenSearch.value = "";
    renderTokenList();
    modal.showModal();
    setTimeout(() => tokenSearch.focus(), 50);
  }

  function pick(sym) {
    const side = state.pickingSide;
    const other = side === "from" ? "to" : "from";
    if (state[other] === sym) state[other] = state[side];
    state[side] = sym;
    modal.close();
    pairChanged();
  }

  $$(".token-btn").forEach((b) => b.addEventListener("click", () => openPicker(b.dataset.side)));
  tokenSearch.addEventListener("input", () => renderTokenList(tokenSearch.value));
  modal.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sym]");
    if (btn && !btn.disabled) pick(btn.dataset.sym);
    if (e.target.closest("[data-close]") || e.target === modal) modal.close();
  });

  /* ---------- chart ---------- */
  const chartCanvas = $("#chart");
  const cctx = chartCanvas.getContext("2d");
  let chartSeries = [];
  let chartAnim = 1;
  let hoverX = null;

  function seriesFor(from, to, tf) {
    const pts = { "1H": 60, "1D": 96, "1W": 84, "1M": 90 }[tf];
    const vol = { "1H": 0.002, "1D": 0.008, "1W": 0.02, "1M": 0.045 }[tf];
    let seed = [...(from.sym + to.sym + tf)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 233280;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const last = from.price / to.price;
    const drift = (from.chg - to.chg) / 100 / pts;
    const out = [last];
    for (let i = 1; i < pts; i++) {
      const prev = out[0];
      out.unshift(prev * (1 - drift + (rnd() - 0.5) * vol));
    }
    return out;
  }

  function renderChart(animate) {
    // chart the token being bought, priced in the token being sold
    const from = bySym[state.to], to = bySym[state.from];
    chartSeries = seriesFor(from, to, state.tf);
    const first = chartSeries[0], last = chartSeries[chartSeries.length - 1];
    const chg = ((last - first) / first) * 100;
    $("#pairLabel").innerHTML = `<span class="icons">${icon(from)}${icon(to)}</span>${from.sym} / ${to.sym}`;
    $("#chartPrice").textContent = fmtNum(last);
    const c = $("#chartChg");
    c.textContent = `${fmtPct(chg)} · ${state.tf}`;
    c.className = chg >= 0 ? "up" : "down";
    $("#mLiq").textContent = fmtUsd(Math.min(from.liq, to.liq));
    $("#mVol").textContent = fmtUsd(Math.min(from.vol, to.vol));
    if (animate && !reduceMotion) {
      chartAnim = 0;
      const t0 = performance.now();
      const step = (now) => {
        chartAnim = Math.min(1, (now - t0) / 900);
        drawChart();
        if (chartAnim < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else {
      chartAnim = 1;
      drawChart();
    }
  }

  function drawChart() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = chartCanvas.clientWidth, h = chartCanvas.clientHeight;
    if (!w || !h) return;
    chartCanvas.width = w * dpr; chartCanvas.height = h * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.clearRect(0, 0, w, h);

    const s = chartSeries;
    const min = Math.min(...s), max = Math.max(...s);
    const pad = (max - min) * 0.15 || max * 0.01;
    const lo = min - pad, hi = max + pad;
    const X = (i) => (i / (s.length - 1)) * w;
    const Y = (v) => h - ((v - lo) / (hi - lo)) * h;
    const up = s[s.length - 1] >= s[0];
    const col = up ? "143,227,180" : "255,138,158";
    const ease = 1 - Math.pow(1 - chartAnim, 3);
    const n = Math.max(2, Math.ceil(s.length * ease));

    // grid
    cctx.strokeStyle = "rgba(255,255,255,0.05)";
    cctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = Math.round((h / 4) * i) + 0.5;
      cctx.beginPath(); cctx.moveTo(0, y); cctx.lineTo(w, y); cctx.stroke();
    }

    const path = () => {
      cctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X(i), y = Y(s[i]);
        if (i === 0) cctx.moveTo(x, y);
        else {
          const px = X(i - 1), py = Y(s[i - 1]);
          cctx.bezierCurveTo((px + x) / 2, py, (px + x) / 2, y, x, y);
        }
      }
    };

    // area
    path();
    cctx.lineTo(X(n - 1), h); cctx.lineTo(0, h); cctx.closePath();
    const g = cctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(${col},0.28)`);
    g.addColorStop(1, `rgba(${col},0)`);
    cctx.fillStyle = g;
    cctx.fill();

    // line
    path();
    cctx.strokeStyle = `rgb(${col})`;
    cctx.lineWidth = 2;
    cctx.shadowColor = `rgba(${col},0.6)`;
    cctx.shadowBlur = 14;
    cctx.stroke();
    cctx.shadowBlur = 0;

    // head dot
    const hx = X(n - 1), hy = Y(s[n - 1]);
    cctx.fillStyle = `rgba(${col},0.25)`;
    cctx.beginPath(); cctx.arc(hx, hy, 9, 0, Math.PI * 2); cctx.fill();
    cctx.fillStyle = `rgb(${col})`;
    cctx.beginPath(); cctx.arc(hx, hy, 4, 0, Math.PI * 2); cctx.fill();

    // crosshair
    if (hoverX !== null && chartAnim === 1) {
      const i = Math.round((hoverX / w) * (s.length - 1));
      const x = X(i), y = Y(s[i]);
      cctx.strokeStyle = "rgba(255,255,255,0.25)";
      cctx.setLineDash([4, 4]);
      cctx.beginPath(); cctx.moveTo(x, 0); cctx.lineTo(x, h); cctx.stroke();
      cctx.setLineDash([]);
      cctx.fillStyle = "#fff";
      cctx.beginPath(); cctx.arc(x, y, 4, 0, Math.PI * 2); cctx.fill();
      const label = fmtNum(s[i]);
      cctx.font = "500 12px 'JetBrains Mono', monospace";
      const tw = cctx.measureText(label).width + 16;
      const lx = Math.min(Math.max(x - tw / 2, 0), w - tw);
      const ly = Math.max(y - 36, 0);
      cctx.fillStyle = "rgba(10,36,24,0.95)";
      cctx.strokeStyle = "rgba(255,255,255,0.14)";
      cctx.beginPath(); cctx.roundRect(lx, ly, tw, 24, 8); cctx.fill(); cctx.stroke();
      cctx.fillStyle = "#ecf7ef";
      cctx.fillText(label, lx + 8, ly + 16);
    }
  }

  chartCanvas.addEventListener("pointermove", (e) => {
    hoverX = e.clientX - chartCanvas.getBoundingClientRect().left;
    drawChart();
  });
  chartCanvas.addEventListener("pointerleave", () => { hoverX = null; drawChart(); });
  addEventListener("resize", drawChart);
  $$("#tfSeg button").forEach((b) => b.addEventListener("click", () => {
    $$("#tfSeg button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.tf = b.dataset.tf;
    renderChart(true);
  }));

  /* ---------- wallet (EIP-1193) ---------- */
  const eth = window.ethereum;
  const connectBtn = $("#connectBtn");

  async function refreshBalance() {
    if (!eth || !state.account || state.chainId !== CHAIN.chainId) {
      state.nativeBalance = null;
      return renderBalances();
    }
    try {
      const hex = await eth.request({ method: "eth_getBalance", params: [state.account, "latest"] });
      state.nativeBalance = Number(BigInt(hex)) / 1e18;
    } catch {
      state.nativeBalance = null;
    }
    renderBalances();
  }

  function renderBalances() {
    const bal = (sym) =>
      sym === "ETH" && state.nativeBalance !== null ? "Balance " + (fmtAmt(state.nativeBalance) || "0") : "Balance —";
    $("#balFrom").textContent = bal(state.from);
    $("#balTo").textContent = bal(state.to);
  }

  function renderWallet() {
    const onChain = state.chainId === CHAIN.chainId;
    connectBtn.textContent = state.account ? short(state.account) : "Connect";
    connectBtn.classList.toggle("connected", !!state.account);
    $("#chainPill").innerHTML = `<i class="dot" style="background:${!state.account || onChain ? "var(--accent-2)" : "var(--down)"}"></i>${
      state.account && !onChain ? "Wrong network" : "Robinhood Chain"
    }`;
    quote();
  }

  async function connect() {
    if (!eth) {
      toast("No EVM wallet detected. Install MetaMask, Rabby or Robinhood Wallet.");
      return;
    }
    try {
      const [acc] = await eth.request({ method: "eth_requestAccounts" });
      state.account = acc || null;
      state.chainId = await eth.request({ method: "eth_chainId" });
      renderWallet();
      if (state.chainId !== CHAIN.chainId) await switchChain();
      else refreshBalance();
    } catch (err) {
      toast(err && err.code === 4001 ? "Connection request rejected." : "Couldn't connect your wallet.");
    }
  }

  async function switchChain() {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.chainId }] });
    } catch (err) {
      if (err && (err.code === 4902 || err.code === -32603)) {
        try {
          await eth.request({ method: "wallet_addEthereumChain", params: [CHAIN] });
        } catch {
          toast("Couldn't add Robinhood Chain to your wallet.");
        }
      } else {
        toast("Network switch cancelled.");
      }
    }
  }

  connectBtn.addEventListener("click", () => {
    if (state.account) {
      navigator.clipboard?.writeText(state.account).then(() => toast("Address copied."), () => toast(state.account));
    } else connect();
  });

  if (eth && eth.on) {
    eth.on("accountsChanged", (accs) => {
      state.account = accs[0] || null;
      renderWallet();
      refreshBalance();
    });
    eth.on("chainChanged", (id) => {
      state.chainId = id;
      renderWallet();
      refreshBalance();
    });
    // restore an existing authorization silently
    eth.request({ method: "eth_accounts" }).then(async (accs) => {
      if (!accs[0]) return;
      state.account = accs[0];
      state.chainId = await eth.request({ method: "eth_chainId" });
      renderWallet();
      refreshBalance();
    }).catch(() => {});
  }

  /* ---------- markets ---------- */
  function sparkline(t) {
    // deterministic pseudo-series per token, trending with its 24h change
    let seed = [...t.sym].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const pts = [];
    let v = 50;
    for (let i = 0; i < 24; i++) {
      v += (rnd() - 0.5) * 10 + t.chg / 12;
      pts.push(v);
    }
    const min = Math.min(...pts), max = Math.max(...pts);
    const d = pts
      .map((p, i) => `${i ? "L" : "M"}${((i / 23) * 100).toFixed(1)},${(31 - ((p - min) / (max - min || 1)) * 29).toFixed(1)}`)
      .join(" ");
    const c = t.chg >= 0 ? "var(--up)" : "var(--down)";
    return `<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }

  let marketFilter = "all";
  function renderMarkets() {
    const q = $("#marketSearch").value.trim().toLowerCase();
    let rows = TOKENS.filter((t) => t.meme).sort((a, b) => b.vol - a.vol);
    if (marketFilter === "gainers") rows = rows.filter((t) => t.chg > 0).sort((a, b) => b.chg - a.chg);
    if (marketFilter === "losers") rows = rows.filter((t) => t.chg < 0).sort((a, b) => a.chg - b.chg);
    if (q) rows = rows.filter((t) => t.sym.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    $("#marketBody").innerHTML = rows.length
      ? rows.map((t, i) => `<tr data-trade="${t.sym}">
          <td class="muted">${String(i + 1).padStart(2, "0")}</td>
          <td><div class="tok">${icon(t)}<div><b>${t.sym}</b><small>${t.name}</small></div></div></td>
          <td class="r">${fmtPrice(t.price)}</td>
          <td class="r ${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</td>
          <td class="r hide-sm">${fmtUsd(t.vol)}</td>
          <td class="r hide-sm">${fmtUsd(t.liq)}</td>
          <td class="r hide-md">${sparkline(t)}</td>
          <td class="r"><button class="trade-btn" data-trade="${t.sym}">Trade</button></td>
        </tr>`).join("")
      : `<tr><td colspan="8" class="empty">No tokens found</td></tr>`;
  }

  $("#marketSearch").addEventListener("input", renderMarkets);
  $$("#marketFilter button").forEach((b) => b.addEventListener("click", () => {
    $$("#marketFilter button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    marketFilter = b.dataset.filter;
    renderMarkets();
  }));
  $("#marketBody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-trade]");
    if (!b) return;
    const sym = b.dataset.trade;
    state.to = sym;
    if (state.from === sym) state.from = sym === "ETH" ? "USDC" : "ETH";
    pairChanged();
    $("#app").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => amountIn.focus({ preventScroll: true }), 700);
  });

  /* ---------- ticker ---------- */
  function renderTicker() {
    const items = TOKENS.filter((t) => t.meme).map((t) => `<span class="tick">${icon(t)}<b>${t.sym}</b><span>${fmtPrice(t.price)}</span>
        <span class="${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</span></span>`).join("");
    $("#ticker").innerHTML = items + items;
  }

  /* ---------- DexScreener: official logos + live market data ---------- */
  // Looks each meme coin up on DexScreener's public API and keeps only pairs on Robinhood Chain,
  // so a same-ticker token on another chain never gets mixed in. Unmatched tokens keep their local icon.
  const DEX_API = "https://api.dexscreener.com/latest/dex/search?q=";
  const isRobinhoodChain = (id) => /robinhood/i.test(id || "");

  async function fetchDexToken(t) {
    const res = await fetch(DEX_API + encodeURIComponent(t.sym));
    if (!res.ok) throw new Error("dexscreener " + res.status);
    const { pairs = [] } = await res.json();
    const matches = pairs.filter((p) =>
      isRobinhoodChain(p.chainId) && p.baseToken && p.baseToken.symbol.toUpperCase() === t.sym);
    if (!matches.length) return false;
    // deepest pool is the most reliable price
    const best = matches.reduce((a, b) => ((b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a));
    if (best.info && best.info.imageUrl) t.logo = best.info.imageUrl;
    if (best.priceUsd) t.price = parseFloat(best.priceUsd);
    if (best.priceChange && best.priceChange.h24 != null) t.chg = best.priceChange.h24;
    t.vol = matches.reduce((s, p) => s + (p.volume?.h24 || 0), 0) || t.vol;
    t.liq = matches.reduce((s, p) => s + (p.liquidity?.usd || 0), 0) || t.liq;
    t.url = best.url;
    t.live = true;
    return true;
  }

  async function syncDexScreener() {
    const memes = TOKENS.filter((t) => t.meme);
    const results = await Promise.allSettled(memes.map(fetchDexToken));
    const live = results.filter((r) => r.status === "fulfilled" && r.value).length;
    if (live) {
      const src = $("#dataSource");
      src.hidden = false;
      src.innerHTML = `<i class="dot live"></i>Live via DexScreener · ${live}/${memes.length}`;
      renderAll();
    }
    setTimeout(syncDexScreener, 60000);
  }

  function renderAll() {
    renderMarkets();
    renderTicker();
    renderHeroVisual();
    renderTopMover();
    renderTokenButtons();
    if (modal.open) renderTokenList(tokenSearch.value);
    if (amountIn.value) quote();
  }

  // gentle price drift so the page feels live (only for tokens without live data)
  setInterval(() => {
    TOKENS.forEach((t) => {
      if (t.sym === "USDC" || t.live) return;
      const d = (Math.random() - 0.5) * 0.003;
      t.price *= 1 + d;
      t.chg += d * 100;
    });
    renderAll();
  }, 5000);

  /* ---------- scroll reveal + counters ---------- */
  const revealEls = $$(".section-head, .terminal > *, .table-panel, .feat, .steps li, .token-copy, .orbit, .faq details, .finale-title");
  revealEls.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 80 + "ms";
    el.classList.add("in");
    io.unobserve(el);
  }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  revealEls.forEach((el) => io.observe(el));

  function startCounters() {
    $$("[data-count]").forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const pre = el.dataset.prefix || "";
      const suf = el.dataset.suffix || "";
      const dec = String(el.dataset.count).includes(".") ? 1 : 0;
      const t0 = performance.now();
      const dur = reduceMotion ? 0 : 1800;
      const step = (now) => {
        const p = dur ? Math.min(1, (now - t0) / dur) : 1;
        const e = 1 - Math.pow(1 - p, 4);
        el.textContent = pre + (target * e).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  $("#year").textContent = new Date().getFullYear();

  /* ---------- init ---------- */
  initWarp();
  initRotator();
  initNetStatus();
  initHeroVisual();
  syncDexScreener();
  initStopwatch();
  initManifesto();
  renderTokenButtons();
  renderBalances();
  renderMarkets();
  renderTicker();
  renderWallet();
  renderChart(false);
  runIntro();
  if (document.fonts) document.fonts.ready.then(drawChart);
})();
