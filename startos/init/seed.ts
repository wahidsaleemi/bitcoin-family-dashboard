import { T } from '@start9labs/start-sdk'
import { storeJson, DashboardConfig } from '../fileModels/store.json'

/**
 * Seeds the default dashboard config (Satoshi) into config.json during
 * install — before any daemon or action runs. This guarantees the
 * Remove/Update member selects are populated on a fresh install and the
 * dashboard renders immediately on first load.
 */
export const seedConfig = async (effects: T.Effects) => {
  const existing = await storeJson.read().once()
  if (existing) return

  const defaultConfig: DashboardConfig = {
    title: 'Bitcoin Family Dashboard',
    familyMembers: [
      {
        name: 'Satoshi',
        avatar: '',
        btcAmount: 0.125,
        avgCost: 40000,
      },
    ],
    priceSource: { type: 'coinbase', apiUrl: '', apiKey: '' },
    pexels: { enabled: false, apiKey: '' },
  }

  await storeJson.write(effects, defaultConfig)
}
