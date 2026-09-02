import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const familyMemberSchema = z.object({
  name: z.string(),
  avatar: z.string().catch(''), // base64 data URI or empty string
  btcAmount: z.number().catch(0),
  avgCost: z.number().catch(0),
})

const priceSourceSchema = z.object({
  type: z.enum(['coinbase', 'binance', 'bitstamp', 'custom']).catch('coinbase'),
  apiUrl: z.string().catch(''),
  apiKey: z.string().catch(''),
})

const pexelsSchema = z.object({
  enabled: z.boolean().catch(false),
  apiKey: z.string().catch(''),
})

// Watch-only wallet binding: member name -> output descriptor + balance source.
// source: 'bitcoind' (local node, default when available) or 'mempool' (public).
const watchOnlyWalletSchema = z.object({
  memberName: z.string(),
  descriptor: z.string(),
  source: z.enum(['bitcoind', 'mempool']).catch('mempool'),
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
  priceSource: priceSourceSchema.catch({ type: 'coinbase', apiUrl: '', apiKey: '' }),
  pexels: pexelsSchema.catch({ enabled: false, apiKey: '' }),
  watchOnlyWallets: z.array(watchOnlyWalletSchema).catch([]),
})

export type FamilyMember = z.infer<typeof familyMemberSchema>
export type PriceSource = z.infer<typeof priceSourceSchema>
export type PexelsConfig = z.infer<typeof pexelsSchema>
export type WatchOnlyWallet = z.infer<typeof watchOnlyWalletSchema>
export type DashboardConfig = z.infer<typeof configSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './config.json' },
  configSchema,
)
