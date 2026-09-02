#!/usr/bin/env node
/**
 * Watch-only wallet balance helper.
 * Serves a single endpoint consumed by nginx: /api/wallet-balance
 *
 * Derives addresses from output descriptors (wpkh/pkh/sh(wpkh)/tr xpub-based)
 * and queries balances from:
 *   - local Bitcoin Core RPC (BITCOIND_RPC env, set by main.ts when the
 *     StartOS bitcoind package is installed), OR
 *   - the public mempool.space API as fallback.
 *
 * Run on an internal port; nginx proxies /api/wallet-balance to it.
 */
import http from 'node:http'
import { createRequire } from 'node:module'
import { BIP32Factory } from 'bip32'
import * as bitcoin from 'bitcoinjs-lib'

const require = createRequire(import.meta.url)
const ecc = require('tiny-secp256k1')

const bip32 = BIP32Factory(ecc)

const PORT = Number(process.env.HELPER_PORT || 8090)
const BITCOIND_RPC = process.env.BITCOIND_RPC || '' // e.g. http://10.0.3.1:8332
const BITCOIND_USER = process.env.BITCOIND_USER || ''
const BITCOIND_PASS = process.env.BITCOIND_PASS || ''
const MEMPOOL_API = process.env.MEMPOOL_API || 'https://mempool.space/api'
const NETWORK = process.env.BITCOIN_NETWORK === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin

const ADDR_SCAN = 25 // derive this many addresses per descriptor for now

/**
 * Parse a descriptor and return a function that produces address for index i.
 * Supports: wpkh(xpub/...), pkh(xpub/...), sh(wpkh(xpub/...)), tr(xpub/...)
 * Also accepts a bare xpub (treats as wpkh). Descriptor paths like
 * xpub.../0/* are supported — the /N path is applied before the index.
 */
function splitXpubPath(s) {
  // xpub/tpub/etc = base58check; then an optional path like /0/*
  const m = s.trim().match(/^([1-9A-HJ-NP-Za-km-z]+)((\/[0-9hH']+)*\/?(\/\*)?)?$/)
  if (!m) throw new Error(`Could not parse xpub from: ${s}`)
  const xpub = m[1]
  const path = m[2] || ''
  return { xpub, path }
}

/** Apply a descriptor path like "/0/*" (hardened ok) to a node, returning a new node rooted at the "*". */
function nodeFromXpubPath(xpub, path) {
  let node = bip32.fromBase58(xpub)
  // Parse path components: /0, /1', /2h, /3H
  const parts = path.split('/').filter(Boolean)
  for (const p of parts) {
    if (p === '*') continue // stop at the wildcard
    let idx = parseInt(p, 10)
    let hardened = false
    if (isNaN(idx)) {
      const m = p.match(/^(\d+)([hH'])$/)
      if (m) { idx = parseInt(m[1], 10); hardened = true }
      else throw new Error(`Bad path component: ${p}`)
    }
    node = hardened ? node.deriveHardened(idx) : node.derive(idx)
  }
  return { node }
}

function parseDescriptor(descriptor) {
  const desc = descriptor.trim()

  // Bare xpub -> wpkh
  if (/^[xyuvt]pub/.test(desc)) {
    const { xpub, path } = splitXpubPath(desc)
    return { type: 'wpkh', xpub, path }
  }

  // tr(xpub...)
  let m = desc.match(/^tr\(([^)]*)\)$/)
  if (m) {
    const { xpub, path } = splitXpubPath(m[1])
    return { type: 'tr', xpub, path }
  }

  // wpkh(xpub...)
  m = desc.match(/^wpkh\(([^)]*)\)$/)
  if (m) {
    const { xpub, path } = splitXpubPath(m[1])
    return { type: 'wpkh', xpub, path }
  }

  // pkh(xpub...)
  m = desc.match(/^pkh\(([^)]*)\)$/)
  if (m) {
    const { xpub, path } = splitXpubPath(m[1])
    return { type: 'pkh', xpub, path }
  }

  // sh(wpkh(xpub...))
  m = desc.match(/^sh\(wpkh\(([^)]*)\)\)$/)
  if (m) {
    const { xpub, path } = splitXpubPath(m[1])
    return { type: 'shwpkh', xpub, path }
  }

  throw new Error(`Unsupported descriptor format: ${descriptor}`)
}

/** Derive address at index i for a parsed descriptor node. */
function deriveAddress(parsed, i) {
  // Apply the descriptor path (e.g. /0/), then the address index.
  // nodeFromXpubPath advances through all non-wildcard components.
  const { node } = nodeFromXpubPath(parsed.xpub, parsed.path)
  const child = node.derive(i)
  const pubkey = child.publicKey

  switch (parsed.type) {
    case 'tr': {
      const xonly = pubkey.slice(1)
      return bitcoin.payments.p2tr({ internalPubkey: xonly, network: NETWORK }).address
    }
    case 'pkh':
      return bitcoin.payments.p2pkh({ pubkey, network: NETWORK }).address
    case 'shwpkh':
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey, network: NETWORK }),
        network: NETWORK,
      }).address
    case 'wpkh':
    default:
      return bitcoin.payments.p2wpkh({ pubkey, network: NETWORK }).address
  }
}

/** Query an address's balance (confirmed + mempool) from mempool.space. */
async function balanceFromMempool(address) {
  const url = `${MEMPOOL_API}/address/${address}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`mempool ${res.status} for ${address}`)
  const data = await res.json()
  const stats = data.chain_stats || {}
  const mempool = data.mempool_stats || {}
  return (stats.funded_txo_sum || 0) - (stats.spent_txo_sum || 0) +
         (mempool.funded_txo_sum || 0) - (mempool.spent_txo_sum || 0)
}

/** Query balance via Bitcoin Core RPC: getreceivedbyaddress per derived address. */
async function balanceFromBitcoind(addresses) {
  const auth = Buffer.from(`${BITCOIND_USER}:${BITCOIND_PASS}`).toString('base64')
  let total = 0
  for (const addr of addresses) {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: 'wallet-helper',
      method: 'getreceivedbyaddress',
      params: [addr, 0],
    })
    const res = await fetch(`${BITCOIND_RPC}/wallet/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body,
    })
    if (!res.ok) {
      const txt = await res.text()
      // Bitcoind may not have a wallet loaded; fall back to public API for this call
      console.error(`bitcoind RPC error for ${addr}: ${res.status} ${txt.slice(0, 120)}`)
      return null
    }
    const data = await res.json()
    if (data.result !== undefined) total += data.result * 1e8
  }
  return total
}

async function handle(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    if (url.pathname !== '/api/wallet-balance') {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'not found' }))
      return
    }

    // Config is read from the volume at /data/config.json
    const fs = await import('node:fs')
    const raw = fs.readFileSync('/data/config.json', 'utf8')
    const config = JSON.parse(raw)
    const wallets = config.watchOnlyWallets || []

    const results = []
    for (const w of wallets) {
      try {
        const parsed = parseDescriptor(w.descriptor)
        const addresses = []
        for (let i = 0; i < ADDR_SCAN; i++) {
          addresses.push(deriveAddress(parsed, i))
        }

        let balanceSats = null
        if (BITCOIND_RPC) {
          balanceSats = await balanceFromBitcoind(addresses)
        }
        if (balanceSats === null) {
          // Public fallback: query each address (parallel, small batches)
          const chunks = []
          for (let i = 0; i < addresses.length; i += 5) {
            chunks.push(
              await Promise.all(
                addresses.slice(i, i + 5).map((a) => balanceFromMempool(a).catch(() => 0)),
              ),
            )
          }
          balanceSats = chunks.flat().reduce((a, b) => a + b, 0)
        }

        results.push({
          memberName: w.memberName,
          descriptor: w.descriptor,
          balanceSats,
          addresses,
          source: BITCOIND_RPC ? 'bitcoind' : 'mempool',
        })
      } catch (e) {
        results.push({
          memberName: w.memberName,
          descriptor: w.descriptor,
          balanceSats: null,
          error: e.message,
        })
      }
    }

    res.writeHead(200)
    res.end(JSON.stringify({ wallets: results }))
  } catch (e) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: e.message }))
  }
}

http.createServer(handle).listen(PORT, () => {
  console.log(`wallet-helper listening on :${PORT} (bitcoind: ${BITCOIND_RPC || 'none -> mempool'})`)
})
