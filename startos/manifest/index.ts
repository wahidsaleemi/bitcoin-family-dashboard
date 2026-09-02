import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'bitcoin-family-dashboard',
  title: 'Bitcoin Family Dashboard',
  license: 'BlueOak-1.0.0',
  packageRepo: 'https://github.com/wahidsaleemi/bitcoin-family-dashboard-startos',
  upstreamRepo: 'https://github.com/wahidsaleemi/bitcoin-family-dashboard',
  marketingUrl: 'https://github.com/wahidsaleemi/bitcoin-family-dashboard',
  donationUrl: 'https://coinos.io/pay/wahid',
  description: { short, long },
  volumes: ['main'],
  images: {
    'bitcoin-family-dashboard': {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {
    bitcoind: {
      description: 'Provides RPC and cookie credentials for watch-only wallet balances. Optional — falls back to the public mempool.space API when not installed.',
      optional: true,
      metadata: {
        title: 'Bitcoin Core',
        icon: 'https://raw.githubusercontent.com/Start9Labs/bitcoin-core-startos/master/icon.svg',
      },
    },
  },
})
