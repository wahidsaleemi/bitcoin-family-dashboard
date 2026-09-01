import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiPort } from './utils'
import { storeJson } from './fileModels/store.json'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Bitcoin Family Dashboard!'))

  // Read config to pass price source settings to the container
  const config = await storeJson.read().const(effects)

  const priceApiUrl = config?.priceSource?.apiUrl ?? ''
  const priceApiKey = config?.priceSource?.apiKey ?? ''
  const priceSource = config?.priceSource?.type ?? 'coingecko'

  // For custom price source, parse the URL to get host for proxy header
  let priceApiHost = ''
  if (priceSource === 'custom' && priceApiUrl) {
    try {
      const parsed = new URL(priceApiUrl)
      priceApiHost = parsed.host
    } catch {
      priceApiHost = priceApiUrl
    }
  }

  return sdk.Daemons.of(effects).addDaemon('web', {
    subcontainer: sdk.SubContainer.of(
      effects,
      { imageId: 'bitcoin-family-dashboard' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/data',
        readonly: false,
      }),
      'nginx',
    ),
    exec: {
      command: ['/docker-entrypoint.sh'],
      env: {
        PRICE_SOURCE: priceSource,
        PRICE_API_URL: priceApiUrl,
        PRICE_API_KEY: priceApiKey,
        PRICE_API_HOST: priceApiHost,
      },
    },
    ready: {
      display: i18n('Web Interface'),
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, uiPort, {
          successMessage: i18n('The web interface is ready'),
          errorMessage: i18n('The web interface is not ready'),
        }),
    },
    requires: [],
  })
})
