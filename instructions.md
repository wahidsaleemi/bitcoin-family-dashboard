# Bitcoin Family Dashboard

A fully client-side Bitcoin dashboard for tracking family BTC holdings, real-time prices, 24-hour changes, and historical performance.

## Features

- Real-time Bitcoin price from common sources (CoinGecko, Binance) or custom API
- Manually enter bitcoin quantity or point to a watch-only wallet
- Per-family-member BTC holdings with USD value and P&L
- 30-day price chart, 1-year price chart, and 10-year price chart
- Historical price comparisons (1 week, 1 month, 1 year)
- Fullscreen-ready
- Auto-generated profile avatars (pravatar) for each member
- Profile avatars can be updated on the dashboard
- Landscape background image rotates automatically

## Actions & Config

All settings are managed from the StartOS **Actions** menu for this service:

- **Add Family Member** — add a member with name, BTC holdings, and average cost basis. An auto-generated avatar is shown automatically.
- **Remove Family Member** — remove an existing member from the dashboard.
- **Update Family Member** — change a member's BTC holdings or average cost basis.
- **Configure Price Source** — choose **Coinbase Exchange** (default, free, no API key), **Binance** (free), **Bitstamp** (free), or **Custom API** with your own endpoint URL and API key.
- **Configure Background** — enable rotating background photos from Pexels (free API key required: [https://www.pexels.com/api/](https://www.pexels.com/api/)). When enabled, a new photo is fetched every 5 minutes.
- **Watch-Only Wallet (Advanced, optional)** — attach a Bitcoin output descriptor to a family member. Balances are fetched automatically: from your StartOS **Bitcoin Core** node when it's installed (via its RPC bridge), otherwise from public APIs with automatic fallback (mempool.space, blockstream.info, blockcypher.com, blockchain.info). Supported descriptor types: `wpkh`, `pkh`, `sh(wpkh)`, `tr`, or a bare xpub. This is entirely optional — skip it if you only track holdings manually.

## Dark Mode

Click the half-moon button (top-right, next to the fullscreen icon) to toggle dark mode. Your preference is remembered in the browser. In dark mode the dashboard panels and chart adapt to a near-black theme.

## Custom Avatars

Each member's avatar starts as an auto-generated pravatar. To use a custom picture:

1. Open the dashboard and hover over a member's avatar — a camera icon appears.
2. Click the avatar and choose an image file.
3. The image is automatically center-cropped to a square, resized to 150×150, and encoded as JPEG — all in your browser, nothing is uploaded to a server.

## Data Sources

- Price data: CoinGecko API, Coinbase, Bitstamp, Binance
- Chart: Chart.js uses data from Binance daily klines
- Watch-only wallet: bitcoind if available, otherwise public APIs with automatic fallback — mempool.space, blockstream.info, blockcypher.com, blockchain.info
- Background image: Pexels API

## Donate

If you find this dashboard useful, you can support the developer: [coinos.io/pay/wahid](https://coinos.io/pay/wahid)

## Privacy

This dashboard is designed for local/private use on your StartOS. It fetches live price data but does not transmit any personal information.
