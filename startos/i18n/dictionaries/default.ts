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
  // actions/background.ts
  'Rotate background image via Pexels': 45,
  'Fetch a new background photo from Pexels every few minutes (free API key required)': 46,
  'Pexels API Key': 47,
  'Get a free key at https://www.pexels.com/api/': 48,
  'Configure Background': 49,
  'Rotate the dashboard background using Pexels photos': 50,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
