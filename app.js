/* degen.exchange — front-end logic (vanilla JS, no build step) */
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
  const TOKENS = [
    { sym: "ETH", name: "Ether", price: 3842.15, chg: 2.41, vol: 18.4e6, liq: 96.2e6, color: "#9fb4ff" },
    { sym: "USDC", name: "USD Coin", price: 1.0, chg: 0.01, vol: 12.1e6, liq: 84.5e6, color: "#5aa2ff" },
    { sym: "DEGEN", name: "degen.exchange", price: 0.4821, chg: 18.73, vol: 6.9e6, liq: 21.3e6, color: "#c6ff3d" },
    { sym: "WETH", name: "Wrapped Ether", price: 3842.15, chg: 2.41, vol: 3.2e6, liq: 30.8e6, color: "#c3cbe0" },
    { sym: "TSLA", name: "Tesla (tokenized)", price: 251.37, chg: -1.84, vol: 2.7e6, liq: 14.1e6, color: "#ff5c7a" },
    { sym: "NVDA", name: "NVIDIA (tokenized)", price: 138.92, chg: 3.27, vol: 2.4e6, liq: 12.9e6, color: "#76d672" },
    { sym: "AAPL", name: "Apple (tokenized)", price: 229.04, chg: 0.66, vol: 1.6e6, liq: 11.2e6, color: "#e2e6e4" },
    { sym: "AMZN", name: "Amazon (tokenized)", price: 187.55, chg: -0.92, vol: 1.1e6, liq: 8.7e6, color: "#ffb84d" },
    { sym: "PEPE", name: "Pepe", price: 0.00001942, chg: -6.35, vol: 0.9e6, liq: 4.2e6, color: "#4fbf5a" },
    { sym: "ARB", name: "Arbitrum", price: 0.7412, chg: 4.12, vol: 0.8e6, liq: 6.6e6, color: "#2d9cff" },
  ];
  const bySym = Object.fromEntries(TOKENS.map((t) => [t.sym, t]));

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const state = {
    from: "ETH",
    to: "DEGEN",
    slippage: 0.5,
    account: null,
    chainId: null,
    nativeBalance: null,
    pickingSide: null,
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
  const fmtAmt = (n) => {
    if (!isFinite(n) || n === 0) return "";
    if (n >= 1e6) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 }).replace(/,/g, "");
    return n.toPrecision(5).replace(/0+$/, "").replace(/\.$/, "");
  };
  const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);

  const icon = (t) =>
    `<span class="tk-icon" style="background:${t.color}">${t.sym.slice(0, t.sym.length > 4 ? 3 : 4)}</span>`;

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const menuBtn = $("#menuBtn");
  const navLinks = $("#navLinks");
  menuBtn.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", navLinks).forEach((a) =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    })
  );

  $$("[data-focus-swap]").forEach((a) =>
    a.addEventListener("click", () => {
      const card = $("#swapForm");
      card.classList.remove("focus");
      void card.offsetWidth;
      card.classList.add("focus");
      setTimeout(() => $("#amountIn").focus({ preventScroll: true }), 500);
    })
  );

  $$("[data-soon]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      toast("Segera hadir 🚀");
    })
  );

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
    $("#usdIn").textContent = "$" + usd.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    $("#usdOut").textContent =
      "$" + (out * to.price).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

    const q = $("#quote");
    q.hidden = !valid;
    if (valid) {
      $("#qRate").textContent = `1 ${from.sym} = ${fmtAmt(from.price / to.price) || "0"} ${to.sym}`;
      const imp = $("#qImpact");
      imp.textContent = impact < 0.01 ? "<0.01%" : impact.toFixed(2) + "%";
      imp.classList.toggle("warn", impact > 3);
      $("#qMin").textContent = `${fmtAmt(out * (1 - state.slippage / 100))} ${to.sym}`;
      const hop = from.sym !== "ETH" && to.sym !== "ETH" && from.sym !== "USDC" && to.sym !== "USDC";
      $("#qRoute").textContent = hop ? `${from.sym} → ETH → ${to.sym}` : `${from.sym} → ${to.sym}`;
    }
    updateSwapButton(valid, a);
  }

  function updateSwapButton(valid, a) {
    const onChain = state.chainId === CHAIN.chainId;
    let label = "Swap";
    let disabled = false;
    if (!state.account) label = "Hubungkan Wallet";
    else if (!onChain) label = "Ganti ke Robinhood Chain";
    else if (!valid) { label = "Masukkan jumlah"; disabled = true; }
    else if (state.from === "ETH" && state.nativeBalance !== null && a > state.nativeBalance) {
      label = "Saldo ETH tidak cukup"; disabled = true;
    }
    swapBtn.textContent = label;
    swapBtn.disabled = disabled;
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
    renderTokenButtons();
    renderBalances();
    quote();
  });

  $$(".quick button").forEach((b) =>
    b.addEventListener("click", () => {
      if (state.from !== "ETH" || state.nativeBalance === null) {
        toast(state.account ? "Saldo token belum tersedia" : "Hubungkan wallet terlebih dahulu");
        return;
      }
      const pct = parseFloat(b.dataset.pct);
      // leave a little ETH for gas when using MAX
      const amt = Math.max(0, state.nativeBalance * pct - (pct === 1 ? 0.0005 : 0));
      amountIn.value = fmtAmt(amt) || "0";
      quote();
    })
  );

  // settings
  $("#settingsBtn").addEventListener("click", () => {
    const s = $("#settings");
    s.hidden = !s.hidden;
  });
  $$("[data-slip]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-slip]").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $("#slipCustom").value = "";
      state.slippage = parseFloat(b.dataset.slip);
      quote();
    })
  );
  $("#slipCustom").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    if (isFinite(v) && v > 0 && v <= 50) {
      $$("[data-slip]").forEach((x) => x.classList.remove("active"));
      state.slippage = v;
      quote();
    }
  });

  $("#swapForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.account) return connect();
    if (state.chainId !== CHAIN.chainId) return switchChain();
    if (!ROUTER_ADDRESS) {
      toast("Mode demo: kontrak router belum di-deploy. Tidak ada transaksi yang dikirim.");
      return;
    }
  });

  /* ---------- token modal ---------- */
  const modal = $("#tokenModal");
  const tokenSearch = $("#tokenSearch");

  function renderTokenList(filter = "") {
    const f = filter.trim().toLowerCase();
    const current = state[state.pickingSide];
    const list = TOKENS.filter((t) => !f || t.sym.toLowerCase().includes(f) || t.name.toLowerCase().includes(f));
    $("#tokenList").innerHTML = list.length
      ? list
          .map(
            (t) => `<li><button type="button" data-sym="${t.sym}" ${t.sym === current ? "disabled" : ""}>
              ${icon(t)}<span><b>${t.sym}</b><small>${t.name}</small></span>
              <span class="px">${fmtPrice(t.price)}<small class="${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</small></span>
            </button></li>`
          )
          .join("")
      : `<li class="muted" style="padding:20px;text-align:center">Token tidak ditemukan</li>`;
    $("#tokenChips").innerHTML = ["ETH", "USDC", "DEGEN", "TSLA"]
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
    renderTokenButtons();
    renderBalances();
    quote();
  }

  $$(".token-btn").forEach((b) => b.addEventListener("click", () => openPicker(b.dataset.side)));
  tokenSearch.addEventListener("input", () => renderTokenList(tokenSearch.value));
  modal.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sym]");
    if (btn && !btn.disabled) pick(btn.dataset.sym);
    if (e.target.closest("[data-close]") || e.target === modal) modal.close();
  });

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
      sym === "ETH" && state.nativeBalance !== null ? "Saldo: " + (fmtAmt(state.nativeBalance) || "0") : "Saldo: —";
    $("#balFrom").textContent = bal(state.from);
    $("#balTo").textContent = bal(state.to);
  }

  function renderWallet() {
    const onChain = state.chainId === CHAIN.chainId;
    connectBtn.textContent = state.account ? short(state.account) : "Hubungkan Wallet";
    connectBtn.classList.toggle("btn-primary", !state.account);
    connectBtn.classList.toggle("btn-ghost", !!state.account);
    const pill = $("#chainPill");
    pill.innerHTML = `<i class="dot" style="background:${!state.account || onChain ? "var(--accent-2)" : "var(--down)"}"></i>${
      state.account && !onChain ? "Jaringan salah" : "Robinhood Chain"
    }`;
    quote();
  }

  async function connect() {
    if (!eth) {
      toast("Wallet EVM tidak ditemukan. Pasang MetaMask, Rabby, atau Robinhood Wallet.");
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
      toast(err && err.code === 4001 ? "Koneksi dibatalkan" : "Gagal menghubungkan wallet");
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
          toast("Gagal menambahkan Robinhood Chain");
        }
      } else {
        toast("Pergantian jaringan dibatalkan");
      }
    }
  }

  connectBtn.addEventListener("click", () => {
    if (state.account) {
      navigator.clipboard?.writeText(state.account).then(
        () => toast("Alamat disalin"),
        () => toast(state.account)
      );
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
      .map((p, i) => `${i ? "L" : "M"}${((i / 23) * 100).toFixed(1)},${(30 - ((p - min) / (max - min || 1)) * 28).toFixed(1)}`)
      .join(" ");
    const c = t.chg >= 0 ? "var(--up)" : "var(--down)";
    return `<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }

  let marketFilter = "all";
  function renderMarkets() {
    const q = $("#marketSearch").value.trim().toLowerCase();
    let rows = [...TOKENS].sort((a, b) => b.vol - a.vol);
    if (marketFilter === "gainers") rows = rows.filter((t) => t.chg > 0).sort((a, b) => b.chg - a.chg);
    if (marketFilter === "losers") rows = rows.filter((t) => t.chg < 0).sort((a, b) => a.chg - b.chg);
    if (q) rows = rows.filter((t) => t.sym.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    $("#marketBody").innerHTML = rows.length
      ? rows
          .map(
            (t, i) => `<tr>
          <td class="muted">${i + 1}</td>
          <td><div class="tok">${icon(t)}<div><b>${t.sym}</b><small>${t.name}</small></div></div></td>
          <td class="r">${fmtPrice(t.price)}</td>
          <td class="r ${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</td>
          <td class="r hide-sm">${fmtUsd(t.vol)}</td>
          <td class="r hide-sm">${fmtUsd(t.liq)}</td>
          <td class="r hide-md">${sparkline(t)}</td>
          <td class="r"><button class="trade-btn" data-trade="${t.sym}">Swap</button></td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="8" class="empty">Token tidak ditemukan</td></tr>`;
  }

  $("#marketSearch").addEventListener("input", renderMarkets);
  $$("#marketFilter button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#marketFilter button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      marketFilter = b.dataset.filter;
      renderMarkets();
    })
  );
  $("#marketBody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-trade]");
    if (!b) return;
    const sym = b.dataset.trade;
    state.to = sym;
    if (state.from === sym) state.from = sym === "ETH" ? "USDC" : "ETH";
    renderTokenButtons();
    renderBalances();
    quote();
    $("#swap").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => amountIn.focus({ preventScroll: true }), 500);
  });

  /* ---------- ticker ---------- */
  function renderTicker() {
    const items = TOKENS.map(
      (t) => `<span class="ticker-item">${icon(t)}${t.sym} <span>${fmtPrice(t.price)}</span>
        <span class="${t.chg >= 0 ? "up" : "down"}">${fmtPct(t.chg)}</span></span>`
    ).join("");
    $("#ticker").innerHTML = items + items;
  }

  // gentle price drift so the page feels live
  setInterval(() => {
    TOKENS.forEach((t) => {
      if (t.sym === "USDC") return;
      const d = (Math.random() - 0.5) * 0.003;
      t.price *= 1 + d;
      t.chg += d * 100;
    });
    bySym.WETH.price = bySym.ETH.price;
    bySym.WETH.chg = bySym.ETH.chg;
    renderMarkets();
    renderTicker();
    if (modal.open) renderTokenList(tokenSearch.value);
    if (amountIn.value) quote();
  }, 5000);

  /* ---------- reveal + counters ---------- */
  const revealEls = $$(".section-head, .feature, .steps li, .table-card, .token-banner, .faq, .cta");
  revealEls.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      }),
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  $$("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    const dec = String(el.dataset.count).includes(".") ? 1 : 0;
    const t0 = performance.now();
    const dur = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (target * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  $("#year").textContent = new Date().getFullYear();

  /* ---------- init ---------- */
  renderTokenButtons();
  renderBalances();
  renderMarkets();
  renderTicker();
  renderWallet();
})();
