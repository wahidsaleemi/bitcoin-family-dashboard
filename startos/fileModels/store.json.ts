import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const familyMemberSchema = z.object({
  name: z.string(),
  avatar: z.string().catch(''), // base64 data URI or empty string
  btcAmount: z.number().catch(0),
  avgCost: z.number().catch(0),
})

const priceSourceSchema = z.object({
  type: z.enum(['coingecko', 'custom']).catch('coingecko'),
  apiUrl: z.string().catch(''),
  apiKey: z.string().catch(''),
})

const configSchema = z.object({
  title: z.string().catch('Bitcoin Family Dashboard'),
  familyMembers: z.array(familyMemberSchema).catch([
    {
      name: 'Satoshi',
      avatar: '',
      btcAmount: 0.125,
      avgCost: 40000,
    },
  ]),
  priceSource: priceSourceSchema.catch({ type: 'coingecko', apiUrl: '', apiKey: '' }),
})

export type FamilyMember = z.infer<typeof familyMemberSchema>
export type PriceSource = z.infer<typeof priceSourceSchema>
export type DashboardConfig = z.infer<typeof configSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './config.json' },
  configSchema,
)
