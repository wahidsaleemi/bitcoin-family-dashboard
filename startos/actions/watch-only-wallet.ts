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
  descriptor: Value.textarea({
    name: i18n('Output Descriptor'),
    description: i18n(
      'Paste the Bitcoin output descriptor from your wallet (e.g. wpkh(xpub...)). Balance fetching will be wired up later.',
    ),
    default: '',
    required: true,
    placeholder: 'wpkh(xpub...)',
  }),
})

export const configureWatchOnlyWallet = sdk.Action.withInput(
  'configure-watch-only-wallet',
  {
    name: i18n('Watch-Only Wallet'),
    description: i18n(
      'Attach a Bitcoin output descriptor to a family member. Balance fetching comes later.',
    ),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Advanced',
  },
  watchOnlyInput,
  async () => {
    const config = (await storeJson.read().once()) ?? defaultConfig()
    return {
      member: config.familyMembers?.[0]?.name ?? '',
      descriptor: '',
    }
  },
  async ({ effects, input }) => {
    const config = (await storeJson.read().once()) ?? defaultConfig()

    const memberName = input.member.trim()
    const descriptor = (input.descriptor ?? '').trim()

    if (!memberName) {
      throw new Error('Please select a family member')
    }
    if (!descriptor) {
      throw new Error('Please enter an output descriptor')
    }

    // Replace any existing binding for this member, or append
    const idx = config.watchOnlyWallets.findIndex((w) => w.memberName === memberName)
    const entry = { memberName, descriptor }
    if (idx >= 0) {
      config.watchOnlyWallets[idx] = entry
    } else {
      config.watchOnlyWallets.push(entry)
    }

    await storeJson.write(effects, config)

    return {
      version: '1' as const,
      title: 'Watch-Only Wallet Updated',
      message: `Saved descriptor for ${memberName}`,
      result: null,
    }
  },
)
