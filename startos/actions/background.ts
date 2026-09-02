import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storeJson, DashboardConfig } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

function defaultConfig(): DashboardConfig {
  return {
    title: 'Bitcoin Family Dashboard',
    familyMembers: [],
    priceSource: { type: 'coinbase', apiUrl: '', apiKey: '' },
    pexels: { enabled: false, apiKey: '' },
    watchOnlyWallets: [],
  }
}

const backgroundInput = InputSpec.of({
  enabled: Value.toggle({
    name: i18n('Rotate background image via Pexels'),
    description: i18n('Fetch a new background photo from Pexels every few minutes (free API key required)'),
    default: false,
  }),
  apiKey: Value.text({
    name: i18n('Pexels API Key'),
    description: i18n('Get a free key at https://www.pexels.com/api/'),
    default: '',
    required: false,
    masked: true,
  }),
})

export const configureBackground = sdk.Action.withInput(
  'configure-background',
  {
    name: i18n('Configure Background'),
    description: i18n('Rotate the dashboard background using Pexels photos'),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Settings',
  },
  backgroundInput,
  async () => {
    const config = (await storeJson.read().once()) ?? defaultConfig()
    return {
      enabled: config.pexels?.enabled ?? false,
      apiKey: config.pexels?.apiKey ?? '',
    }
  },
  async ({ effects, input }) => {
    const config = (await storeJson.read().once()) ?? defaultConfig()

    config.pexels = {
      enabled: input.enabled,
      apiKey: (input.apiKey ?? '').trim(),
    }

    await storeJson.write(effects, config)

    return {
      version: '1' as const,
      title: 'Background Updated',
      message: config.pexels.enabled
        ? 'Background rotation enabled'
        : 'Background rotation disabled',
      result: null,
    }
  },
)
