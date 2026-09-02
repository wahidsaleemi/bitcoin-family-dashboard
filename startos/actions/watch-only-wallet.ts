import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storeJson, DashboardConfig } from '../fileModels/store.json'

const { InputSpec, Value, Variants } = sdk

function defaultConfig(): DashboardConfig {
  return {
    title: 'Bitcoin Family Dashboard',
    familyMembers: [],
    priceSource: { type: 'coinbase', apiUrl: '', apiKey: '' },
    pexels: { enabled: false, apiKey: '' },
    watchOnlyWallets: [],
  }
}

// Per-member sub-form: source + descriptor, prefilled with that member's
// saved values. Switching the member union rebuilds these fields.
function memberWalletSpec(memberName: string, source: 'bitcoind' | 'mempool', descriptor: string) {
  return InputSpec.of({
    source: Value.select({
      name: i18n('Balance Source'),
      description: i18n(
        'Where to fetch the balance from: your local Bitcoin Core node (instant, private) or the public mempool.space API',
      ),
      default: source,
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
      default: descriptor,
      required: true,
      placeholder: 'wpkh(xpub...)',
    }),
  })
}

const watchOnlyUnion = Value.dynamicUnion(async ({ prefill }: any) => {
  const config = (await storeJson.read().once()) ?? defaultConfig()
  const members = config.familyMembers ?? []

  const variants: Record<string, { name: string; spec: any }> = {}
  members.forEach((m: { name: string }) => {
    const existing = config.watchOnlyWallets.find((w) => w.memberName === m.name)
    variants[m.name] = {
      name: m.name,
      spec: memberWalletSpec(
        m.name,
        existing?.source ?? 'bitcoind',
        existing?.descriptor ?? '',
      ),
    }
  })

  const wanted = prefill?.selection as string | undefined
  const selected = members.find((m: { name: string }) => m.name === wanted) ?? members[0]

  return {
    name: i18n('Select Member'),
    description: i18n('Choose which family member this wallet belongs to'),
    variants: Variants.of(variants as any) as any,
    default: (selected?.name ?? '') as any,
    disabled: false as const,
  }
})

const watchOnlyInput = InputSpec.of({
  member: watchOnlyUnion as any,
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
    const first = config.familyMembers?.[0]
    const existing = config.watchOnlyWallets.find((w) => w.memberName === first?.name)
    return {
      member: {
        selection: first?.name ?? '',
        value: {
          source: existing?.source ?? 'bitcoind',
          descriptor: existing?.descriptor ?? '',
        },
      },
    }
  },
  async ({ effects, input }: any) => {
    const config = (await storeJson.read().once()) ?? defaultConfig()

    const memberName = (input.member?.selection as string) ?? ''
    const values = (input.member?.value ?? {}) as {
      source?: string
      descriptor?: string
    }
    const descriptor = (values.descriptor ?? '').trim()
    const source = values.source === 'mempool' ? 'mempool' : 'bitcoind'

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
