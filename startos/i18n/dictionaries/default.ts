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
  'Profile Picture': 9,
  'Upload a profile picture (recommended 150x150)': 10,
  'BTC Amount': 11,
  'Total Bitcoin holdings for this member': 12,
  'Average Cost Basis (USD)': 13,
  'Average purchase price per BTC in USD': 14,
  'Remove Family Member': 15,
  'Remove a family member from the dashboard': 16,
  'Select Member to Remove': 17,
  'Choose which family member to remove from the dashboard': 18,
  'Update Family Member': 19,
  'Update BTC holdings or profile picture for a family member': 20,
  'Select Member to Update': 21,
  'Choose which family member to update': 22,
  'Profile Picture (optional, to replace)': 23,
  'Leave empty to keep current avatar. Upload new image to replace.': 24,
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
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
