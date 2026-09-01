import * as fs from 'fs'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storeJson, DashboardConfig } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

const MAX_MEMBERS = 6

function defaultConfig(): DashboardConfig {
  return {
    title: 'Bitcoin Family Dashboard',
    familyMembers: [],
    priceSource: { type: 'coingecko', apiUrl: '', apiKey: '' },
  }
}

async function readConfig(): Promise<DashboardConfig> {
  return (await storeJson.read().once()) ?? defaultConfig()
}

function fileToDataUri(filePath: string): string {
  const data = fs.readFileSync(filePath)
  const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  return `data:${mime};base64,${data.toString('base64')}`
}

// ── Helper: build member select values from config ─────────────
async function buildMemberSelect(opts: { effects: any; prefill: any }) {
  const config = await readConfig()
  const values: Record<string, string> = {}
  config.familyMembers.forEach((m) => {
    values[m.name] = m.name
  })
  return {
    name: 'Members',
    description: 'Select a family member',
    default: config.familyMembers[0]?.name ?? '',
    values,
  }
}

// ── Add Family Member ─────────────────────────────────────────────

const addMemberInput = InputSpec.of({
  name: Value.text({
    name: i18n('Member Name'),
    description: i18n('Display name for this family member'),
    required: true,
    default: '',
    masked: false,
  }),
  avatar: Value.file({
    name: i18n('Profile Picture'),
    description: i18n('Upload a profile picture (recommended 150x150)'),
    required: false,
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
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
    avatar: null as { path: string; commitment: { hash: string; size: number } } | null,
    btcAmount: 0,
    avgCost: 0,
  }),
  async ({ effects, input }) => {
    const config = await readConfig()

    if (config.familyMembers.length >= MAX_MEMBERS) {
      throw new Error(`Maximum of ${MAX_MEMBERS} family members allowed`)
    }

    const avatar = input.avatar ? fileToDataUri(input.avatar.path) : ''

    config.familyMembers.push({
      name: input.name.trim(),
      avatar,
      btcAmount: input.btcAmount,
      avgCost: input.avgCost,
    })

    await storeJson.write(effects, config)
    return {
      version: '1' as const,
      title: 'Member Added',
      message: `Added "${input.name}" to the dashboard`,
      result: null,
    }
  },
)

// ── Remove Family Member ──────────────────────────────────────────

const removeMemberInput = InputSpec.of({
  member: Value.dynamicSelect(buildMemberSelect as any),
})

export const removeMember = sdk.Action.withInput(
  'remove-member',
  {
    name: i18n('Remove Family Member'),
    description: i18n('Remove a family member from the dashboard'),
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: 'Family Members',
  },
  removeMemberInput,
  async () => {
    const config = await readConfig()
    return { member: config.familyMembers[0]?.name ?? '' }
  },
  async ({ effects, input }) => {
    const config = await readConfig()
    const idx = config.familyMembers.findIndex((m) => m.name === input.member)
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

const updateMemberInput = InputSpec.of({
  member: Value.dynamicSelect(buildMemberSelect as any),
  btcAmount: Value.number({
    name: i18n('BTC Amount'),
    description: i18n('Updated BTC holdings'),
    required: true,
    default: 0,
    min: 0,
    max: 21000000,
    integer: false,
    units: 'BTC',
  }),
  avgCost: Value.number({
    name: i18n('Average Cost Basis (USD)'),
    description: i18n('Updated average purchase price per BTC'),
    required: true,
    default: 0,
    min: 0,
    max: 100000000,
    integer: false,
    units: 'USD',
  }),
  avatar: Value.file({
    name: i18n('Profile Picture (optional, to replace)'),
    description: i18n('Leave empty to keep current avatar. Upload new image to replace.'),
    required: false,
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  }),
})

export const updateMember = sdk.Action.withInput(
  'update-member',
  {
    name: i18n('Update Family Member'),
    description: i18n('Update BTC holdings or profile picture for a family member'),
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
      member: first?.name ?? '',
      btcAmount: first?.btcAmount ?? 0,
      avgCost: first?.avgCost ?? 0,
      avatar: null as { path: string; commitment: { hash: string; size: number } } | null,
    }
  },
  async ({ effects, input }) => {
    const config = await readConfig()
    const member = config.familyMembers.find((m) => m.name === input.member)
    if (!member) {
      throw new Error(`Member "${input.member}" not found`)
    }

    member.btcAmount = input.btcAmount
    member.avgCost = input.avgCost

    if (input.avatar) {
      member.avatar = fileToDataUri(input.avatar.path)
    }

    await storeJson.write(effects, config)
    return {
      version: '1' as const,
      title: 'Member Updated',
      message: `Updated "${input.member}"`,
      result: null,
    }
  },
)
