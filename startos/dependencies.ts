import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(
  async ({ effects }) => ({
    bitcoind: {
      kind: 'exists', // optional: only warn if bitcoind is NOT installed (fully functional via mempool fallback)
      id: 'bitcoind',
      versionRange: '*',
    },
  }),
)
