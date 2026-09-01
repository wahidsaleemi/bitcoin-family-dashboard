import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storeJson, DashboardConfig } from '../fileModels/store.json'

const { InputSpec, Value, Variants } = sdk

const MAX_MEMBERS = 6

function defaultConfig(): DashboardConfig {
  return {
    title: 'Bitcoin Family Dashboard',
    familyMembers: [
      { name: 'Satoshi', avatar: '', btcAmount: 0.125, avgCost: 40000 },
    ],
    priceSource: { type: 'coinbase', apiUrl: '', apiKey: '' },
    pexels: { enabled: false, apiKey: '' },
  }
}

async function readConfig(): Promise<DashboardConfig> {
  return (await storeJson.read().once()) ?? defaultConfig()
}

// ── Add Family Member ─────────────────────────────────────────────
// No avatar field: the dashboard always shows an auto-generated pravatar
// by default, and the user changes it by clicking the avatar on the
// dashboard itself (client-side upload/resize/encode).

const addMemberInput = InputSpec.of({
  name: Value.text({
    name: i18n('Member Name'),
    description: i18n('Display name for this family member'),
    required: true,
    default: '',
    masked: false,
  }),
  btcAmount: Value.number({
    name: i18n('BTC Amount'),
    description: i18n('Total Bitcoin holdings for this member'),
    required: true,
    default: 0,
    min: 0,
    max: 21000000,
    integer: false,
    units: 'BTC',
  }),
  avgCost: Value.number({
    name: i18n('Average Cost Basis (USD)'),
    description: i18n('Average purchase price per BTC in USD'),
    required: true,
    default: 0,
    min: 0,
    max: 100000000,
    integer: false,
    units: 'USD',
  }),
})

export const addMember = sdk.Action.withInput(
  'add-member',
  {
    name: i18n('Add Family Member'),
    description: i18n('Add a new family member to the dashboard'),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Family Members',
  },
  addMemberInput,
  async () => ({
    name: '',
    btcAmount: 0,
    avgCost: 0,
  }),
  async ({ effects, input }: any) => {
    const config = await readConfig()

    if (config.familyMembers.length >= MAX_MEMBERS) {
      throw new Error(`Maximum of ${MAX_MEMBERS} family members allowed`)
    }

    const name = input.name.trim()
    if (!name) {
      throw new Error('Member name is required')
    }
    if (config.familyMembers.some((m: { name: string }) => m.name === name)) {
      throw new Error(`A member named "${name}" already exists`)
    }

    config.familyMembers.push({
      name,
      avatar: '', // auto-generated pravatar shown on dashboard
      btcAmount: input.btcAmount,
      avgCost: input.avgCost,
    })

    await storeJson.write(effects, config)
    return {
      version: '1' as const,
      title: 'Member Added',
      message: `Added "${name}" to the dashboard`,
      result: null,
    }
  },
)

// ── Remove Family Member ──────────────────────────────────────────

const removeMemberInput = InputSpec.of({
  member: Value.dynamicSelect(async () => {
    const config = await readConfig()
    const values: Record<string, string> = {}
    config.familyMembers.forEach((m) => {
      values[m.name] = m.name
    })
    return {
      name: i18n('Select Member to Remove'),
      description: i18n('Choose which family member to remove from the dashboard'),
      default: (config.familyMembers[0]?.name ?? '') as any,
      values,
    }
  }),
})

export const removeMember = sdk.Action.withInput(
  'remove-member',
  {
    name: i18n('Remove Family Member'),
    description: i18n('Remove a family member from the dashboard'),
    warning: i18n('This permanently removes the member from the dashboard'),
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Family Members',
  },
  removeMemberInput,
  async () => {
    const config = await readConfig()
    return { member: config.familyMembers[0]?.name ?? '' }
  },
  async ({ effects, input }: any) => {
    const config = await readConfig()
    const idx = config.familyMembers.findIndex((m: { name: string }) => m.name === input.member)
    if (idx === -1) {
      throw new Error(`Member "${input.member}" not found`)
    }
    config.familyMembers.splice(idx, 1)
    await storeJson.write(effects, config)
    return {
      version: '1' as const,
      title: 'Member Removed',
      message: `Removed "${input.member}" from the dashboard`,
      result: null,
    }
  },
)

// ── Update Family Member ──────────────────────────────────────────
// A dynamic union: each family member is a variant carrying a sub-form
// prefilled with that member's CURRENT values. Switching the selection
// re-runs the builder and shows the other member's real holdings/cost.

function memberVariantSpec(member: { name: string; btcAmount: number; avgCost: number }) {
  return InputSpec.of({
    btcAmount: Value.number({
      name: i18n('BTC Amount'),
      description: i18n('Updated BTC holdings'),
      required: true,
      default: member.btcAmount,
      min: 0,
      max: 21000000,
      integer: false,
      units: 'BTC',
    }),
    avgCost: Value.number({
      name: i18n('Average Cost Basis (USD)'),
      description: i18n('Updated average purchase price per BTC'),
      required: true,
      default: member.avgCost,
      min: 0,
      max: 100000000,
      integer: false,
      units: 'USD',
    }),
  })
}

const updateMemberUnion = Value.dynamicUnion(async ({ prefill }: any) => {
  const config = await readConfig()
  const members = config.familyMembers

  const variants: Record<string, { name: string; spec: any }> = {}
  members.forEach((m: { name: string; btcAmount: number; avgCost: number }) => {
    variants[m.name] = { name: m.name, spec: memberVariantSpec(m) }
  })

  const wanted = prefill?.selection as string | undefined
  const selected = members.find((m: { name: string }) => m.name === wanted) ?? members[0]

  return {
    name: i18n('Select Member to Update'),
    description: i18n('Choose which family member to update'),
    variants: Variants.of(variants as any) as any,
    default: (selected?.name ?? '') as any,
    disabled: false as const,
  }
})

const updateMemberInput = InputSpec.of({
  member: updateMemberUnion as any,
})

export const updateMember = sdk.Action.withInput(
  'update-member',
  {
    name: i18n('Update Family Member'),
    description: i18n('Update BTC holdings or average cost basis for a family member'),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Family Members',
  },
  updateMemberInput,
  async () => {
    const config = await readConfig()
    const first = config.familyMembers[0]
    return {
      member: {
        selection: first?.name ?? '',
        value: {
          btcAmount: first?.btcAmount ?? 0,
          avgCost: first?.avgCost ?? 0,
        },
      },
    }
  },
  async ({ effects, input }: any) => {
    const config = await readConfig()

    const selection = input.member?.selection as string | undefined
    const values = input.member?.value ?? {}

    const member = config.familyMembers.find((m: { name: string }) => m.name === selection)
    if (!member) {
      throw new Error(
        selection
          ? `Member "${selection}" not found`
          : 'No family member selected — there may be no members configured yet',
      )
    }

    if (typeof values.btcAmount === 'number') member.btcAmount = values.btcAmount
    if (typeof values.avgCost === 'number') member.avgCost = values.avgCost

    await storeJson.write(effects, config)
    return {
      version: '1' as const,
      title: 'Member Updated',
      message: `Updated "${member.name}"`,
      result: null,
    }
  },
)
