export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Bitcoin Family Dashboard!': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  'The Bitcoin Family Dashboard web interface': 4,
  // actions/family-members.ts
  'Add Family Member': 5,
  'Add a new family member to the dashboard': 6,
  'Member Name': 7,
  'Display name for this family member': 8,
  'BTC Amount': 11,
  'Total Bitcoin holdings for this member': 12,
  'Average Cost Basis (USD)': 13,
  'Average purchase price per BTC in USD': 14,
  'Remove Family Member': 15,
  'Remove a family member from the dashboard': 16,
  'Select Member to Remove': 17,
  'Choose which family member to remove from the dashboard': 18,
  'Update Family Member': 19,
  'Update BTC holdings or average cost basis for a family member': 20,
  'Select Member to Update': 21,
  'Choose which family member to update': 22,
  'This permanently removes the member from the dashboard': 35,
  'Updated BTC holdings': 33,
  'Updated average purchase price per BTC': 34,
  // actions/price-source.ts
  'Configure Price Source': 25,
  'Set the Bitcoin price data source': 26,
  'Price Source': 27,
  'Select the price data provider': 28,
  'API URL': 29,
  'Base URL for the custom price API': 30,
  'API Key': 31,
  'Authentication key for the custom price API': 32,
  'Coinbase (default, free, no API key)': 43,
  'CoinGecko (free, no API key)': 44,
  'Coinbase Exchange (default, free, no API key)': 51,
  'Binance (free, no API key)': 52,
  'Bitstamp (free, no API key)': 53,
  // actions/background.ts
  'Rotate background image via Pexels': 45,
  'Fetch a new background photo from Pexels every few minutes (free API key required)': 46,
  'Pexels API Key': 47,
  'Get a free key at https://www.pexels.com/api/': 48,
  'Configure Background': 49,
  'Rotate the dashboard background using Pexels photos': 50,
  // actions/watch-only-wallet.ts
  'Watch-Only Wallet': 54,
  'Attach a Bitcoin output descriptor to a family member. Balance fetching comes later.': 55,
  'Select Member': 56,
  'Choose which family member this wallet belongs to': 57,
  'Output Descriptor': 58,
  'Paste the Bitcoin output descriptor from your wallet (e.g. wpkh(xpub...)). Balance fetching will be wired up later.': 59,
  'Watch-Only Wallet (Advanced)': 60,
  'ADVANCED — totally optional. Attach a Bitcoin output descriptor to a family member to show their on-chain balance on the dashboard. Skip this entirely if you only track holdings manually.': 61,
  'Watch-only wallet scan': 62,
  'Watch-only wallet scanner is not responding': 63,
  'Balance Source': 64,
  'Where to fetch the balance from: your local Bitcoin Core node (instant, private) or the public mempool.space API': 65,
  'Paste the Bitcoin output descriptor from your wallet (e.g. wpkh(xpub...)). Balances are fetched from the selected source.': 66,
  'Bitcoin Core (local node)': 67,
  'mempool.space (public)': 68,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
