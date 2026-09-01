# Bitcoin Family Dashboard

A fully client-side Bitcoin dashboard for tracking family BTC holdings, real-time prices, 24-hour changes, and historical performance.

## Features

- Real-time Bitcoin price from CoinGecko API
- Per-family-member BTC holdings with USD value and P&L
- 30-day price chart
- Historical price comparisons (1 week, 1 month, 1 year)
- Dark theme, fullscreen-ready

## Configuration

Edit `index.html` to customize:

1. **Family members** — Update names, avatars, BTC amounts, and average cost basis in the `familyMembers` array
2. **Avatars** — Replace `https://i.pravatar.cc/150?img=X` URLs with your own images
3. **Price refresh** — Default is 99 seconds (CoinGecko free-tier safe)

## Data Sources

- Price data: [CoinGecko API](https://www.coingecko.com/en/api) (free, no API key required)
- Chart: [Chart.js](https://www.chartjs.org/)

## Privacy

This dashboard is designed for local/private use on your StartOS. It fetches live price data but does not transmit any personal information.
