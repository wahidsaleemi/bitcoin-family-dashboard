import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storeJson, DashboardConfig } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

function defaultConfig(): DashboardConfig {
  return {
    title: 'Bitcoin Family Dashboard',
    familyMembers: [],
    priceSource: { type: 'coingecko', apiUrl: '', apiKey: '' },
  }
}

const priceSourceInput = InputSpec.of({
  type: Value.select({
    name: i18n('Price Source'),
    description: i18n('Select the price data provider'),
    default: 'coingecko',
    values: {
      coingecko: 'CoinGecko (free, no API key)',
      custom: 'Custom API',
    },
  }),
  apiUrl: Value.text({
    name: i18n('API URL'),
    description: i18n('Base URL for the custom price API'),
    default: '',
    required: false,
    masked: false,
  }),
  apiKey: Value.text({
    name: i18n('API Key'),
    description: i18n('Authentication key for the custom price API'),
    default: '',
    required: false,
    masked: true,
  }),
})

export const configurePriceSource = sdk.Action.withInput(
  'configure-price-source',
  {
    name: i18n('Configure Price Source'),
    description: i18n('Set the Bitcoin price data source'),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Settings',
  },
  priceSourceInput,
  async () => {
    const config = (await storeJson.read().once()) ?? defaultConfig()
    return {
      type: config.priceSource.type,
      apiUrl: config.priceSource.apiUrl,
      apiKey: config.priceSource.apiKey,
    }
  },
  async ({ effects, input }) => {
    const config = (await storeJson.read().once()) ?? defaultConfig()

    config.priceSource = {
      type: input.type as 'coingecko' | 'custom',
      apiUrl: (input.apiUrl ?? '').trim(),
      apiKey: (input.apiKey ?? '').trim(),
    }

    await storeJson.write(effects, config)

    const sourceName = input.type === 'coingecko' ? 'CoinGecko' : `Custom (${input.apiUrl})`
    return {
      version: '1' as const,
      title: 'Price Source Updated',
      message: `Price source set to ${sourceName}`,
      result: null,
    }
  },
)
