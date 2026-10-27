# degen.exchange

DEX landing page + swap UI untuk **Robinhood Chain** (HTML/CSS/JS murni, tanpa build step).

![preview](assets/preview.png)

## Jalankan

```bash
npx serve .        # atau: python3 -m http.server 8080
```

Buka `http://localhost:8080`. Bisa langsung di-deploy ke Vercel, Netlify, Cloudflare Pages, atau GitHub Pages.

## Fitur

- Hero + kartu swap (pilih token, flip, slippage, MAX/50%, kuotasi, price impact, rute)
- Koneksi wallet EIP-1193 (MetaMask, Rabby, Robinhood Wallet, dll.), otomatis switch/tambah Robinhood Chain, baca saldo ETH asli
- Tabel pasar dengan pencarian, filter naik/turun, sparkline, tombol swap
- Ticker harga, fitur, cara kerja, tokenomics $DEGEN, FAQ, footer
- Responsif (mobile menu), animasi reveal, `prefers-reduced-motion`

## Konfigurasi (`app.js`)

- `CHAIN` — parameter jaringan (saat ini Robinhood Chain Testnet, chain ID 46630). Ganti saat mainnet tersedia.
- `ROUTER_ADDRESS` — alamat kontrak router. Selama `null`, tombol Swap berjalan dalam **mode demo** (tidak ada transaksi dikirim).
- `TOKENS` — daftar token dan harga indikatif. Ganti dengan feed harga on-chain/API untuk produksi.

> Proyek independen, tidak berafiliasi dengan Robinhood Markets, Inc.
