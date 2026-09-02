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

const watchOnlyInput = InputSpec.of({
  member: Value.dynamicSelect(async () => {
    const config = await storeJson.read().once()
    const values: Record<string, string> = {}
    config?.familyMembers?.forEach((m) => {
      values[m.name] = m.name
    })
    return {
      name: i18n('Select Member'),
      description: i18n('Choose which family member this wallet belongs to'),
      default: (config?.familyMembers?.[0]?.name ?? '') as any,
      values,
    }
  }),
  source: Value.select({
    name: i18n('Balance Source'),
    description: i18n('Where to fetch the balance from: your local Bitcoin Core node (instant, private) or the public mempool.space API'),
    default: 'bitcoind',
    values: {
      bitcoind: 'Bitcoin Core (local node)',
      mempool: 'mempool.space (public)',
    },
  }),
  descriptor: Value.textarea({
    name: i18n('Output Descriptor'),
    description: i18n(
      'Paste the Bitcoin output descriptor from your wallet (e.g. wpkh(xpub...)). Balances are fetched from the selected source.',
    ),
    default: '',
    required: true,
    placeholder: 'wpkh(xpub...)',
  }),
})

export const configureWatchOnlyWallet = sdk.Action.withInput(
  'configure-watch-only-wallet',
  {
    name: i18n('Watch-Only Wallet (Advanced)'),
    description: i18n(
      'ADVANCED — totally optional. Attach a Bitcoin output descriptor to a family member to show their on-chain balance on the dashboard. Skip this entirely if you only track holdings manually.',
    ),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Settings',
  },
  watchOnlyInput,
  async () => {
    const config = (await storeJson.read().once()) ?? defaultConfig()
    const memberName = config.familyMembers?.[0]?.name ?? ''
    // Prefill with any previously-saved descriptor + source for this member
    const existing = config.watchOnlyWallets.find((w) => w.memberName === memberName)
    return {
      member: memberName,
      source: existing?.source ?? 'bitcoind',
      descriptor: existing?.descriptor ?? '',
    }
  },
  async ({ effects, input }) => {
    const config = (await storeJson.read().once()) ?? defaultConfig()

    const memberName = input.member.trim()
    const descriptor = (input.descriptor ?? '').trim()
    const source = input.source === 'mempool' ? 'mempool' : 'bitcoind'

    if (!memberName) {
      throw new Error('Please select a family member')
    }
    if (!descriptor) {
      throw new Error('Please enter an output descriptor')
    }

    // Replace any existing binding for this member, or append
    const idx = config.watchOnlyWallets.findIndex((w) => w.memberName === memberName)
    const entry = { memberName, descriptor, source: source as 'bitcoind' | 'mempool' }
    if (idx >= 0) {
      config.watchOnlyWallets[idx] = entry
    } else {
      config.watchOnlyWallets.push(entry)
    }

    await storeJson.write(effects, config)

    return {
      version: '1' as const,
      title: 'Watch-Only Wallet Updated',
      message: `Saved descriptor for ${memberName} (${source})`,
      result: null,
    }
  },
)
