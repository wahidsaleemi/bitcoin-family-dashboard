import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiPort } from './utils'
import { storeJson } from './fileModels/store.json'

const COINBASE_SPOT_URL = 'https://api.coinbase.com/v2/prices/BTC-USD/spot'
const COINBASE_HISTORIC_URL = 'https://api.coinbase.com/v2/prices/BTC-USD/historic'
const COINGECKO_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Bitcoin Family Dashboard!'))

  // Resolve the price upstream so nginx can proxy browser requests to it.
  // Browsers can't call price APIs directly (CORS), but the nginx
  // subcontainer can — CORS is a browser-enforced policy.
  const config = await storeJson.read().const(effects)
  const source = config?.priceSource
  const type = source?.type ?? 'coinbase'
  const isCustom = type === 'custom' && !!source?.apiUrl?.trim()
  const pexelsKey = config?.pexels?.apiKey?.trim() ?? ''

  function safeHost(url: string): string {
    try {
      return new URL(url).host
    } catch {
      return url.replace(/^https?:\/\//, '').split('/')[0]
    }
  }

  let priceUpstream: string
  let priceHost: string

  switch (type) {
    case 'custom':
      priceUpstream = source!.apiUrl.trim()
      priceHost = safeHost(source!.apiUrl.trim())
      break
    case 'coingecko':
      priceUpstream = COINGECKO_PRICE_URL
      priceHost = 'api.coingecko.com'
      break
    case 'coinbase':
    default:
      priceUpstream = COINBASE_SPOT_URL
      priceHost = 'api.coinbase.com'
      break
  }

  // Startup diagnostics — plain strings (not user-facing UI text)
  console.info(`Price source: ${type}${isCustom ? ` (${priceUpstream})` : ''}`)
  console.info(`Proxy upstream: ${priceUpstream} (Host: ${priceHost})`)
  console.info(`Web interface will listen on port ${uiPort}`)

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
      command: sdk.useEntrypoint(['nginx', '-g', 'daemon off;']),
      env: {
        PRICE_UPSTREAM: priceUpstream,
        PRICE_HOST: priceHost,
        PEXELS_API_KEY: pexelsKey,
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
