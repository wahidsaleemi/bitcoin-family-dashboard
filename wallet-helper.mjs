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
const MEMPOOL_API = process.env.MEMPOOL_API || 'https://mempool.space/api'
const NETWORK = process.env.BITCOIN_NETWORK === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin

/**
 * Strip a descriptor checksum suffix (#xxxxxx) if present.
 */
function stripChecksum(s) {
  return s.replace(/#[0-9a-z]{8}$/, '').trim()
}

/**
 * Parse a key expression: optional [fingerprint/path] origin, an xpub, and a
 * trailing /path or <a;b> multipath. Returns { xpub, originPath, paths }
 * where paths is a list of trailing path strings (usually ['0'] for /0/*,
 * or ['0','1'] for <0;1>/*). The wildcard (*) is consumed separately.
 */
function parseKeyExpr(expr) {
  let s = stripChecksum(expr).trim()

  // Key origin: [fingerprint/path]xpub...
  let originPath = ''
  let origin = s.match(/^\[([0-9a-fA-F]{8}(?:\/[0-9hH']+)*)\](.*)$/)
  if (origin) {
    originPath = origin[1].slice(9) // drop the fingerprint (8 hex chars), keep /path
    s = origin[2].trim()
  }

  // Multipath: <0;1> suffix (external;change)
  let paths = ['0']
  let mp = s.match(/^(.*)<([0-9;hH']+)>(.*)$/)
  if (mp) {
    s = (mp[1] + mp[3]).trim()
    paths = mp[2].split(';')
  }

  // Collapse any double slash left by multipath removal (xpub...//*)
  s = s.replace(/\/\//, '/')

  // Trailing path like /0/* or bare /* — extract the last non-wildcard dir
  let trailing = ''
  const tp = s.match(/^(.*?)(\/[0-9hH']+\/\*)$/)
  if (tp) {
    trailing = tp[2].replace(/\/\*$/, '')
    s = tp[1].trim()
  } else {
    // bare /* (multipath already consumed the number) or just /N
    const tp2 = s.match(/^(.*?)(\/[0-9hH']+)(\/\*)?$/)
    if (tp2) {
      trailing = tp2[2]
      s = tp2[1].trim()
    } else {
      // strip a bare /* if nothing else matched
      s = s.replace(/\/\*$/, '')
    }
  }

  const xpub = s.trim()
  if (!/^[xyuvt]pub/.test(xpub)) {
    throw new Error(`Could not parse xpub from: ${expr}`)
  }
  return { xpub, originPath, paths, trailing }
}

/** Apply a derivation path string ("/0/1h/2") to a node. */
function derivePath(node, path) {
  let cur = node
  const parts = path.split('/').filter(Boolean)
  for (const p of parts) {
    let idx = parseInt(p, 10)
    let hardened = false
    if (isNaN(idx)) {
      const m = p.match(/^(\d+)([hH'])$/)
      if (m) { idx = parseInt(m[1], 10); hardened = true }
      else throw new Error(`Bad path component: ${p}`)
    }
    cur = hardened ? cur.deriveHardened(idx) : cur.derive(idx)
  }
  return cur
}

function parseDescriptor(descriptor) {
  const desc = stripChecksum(descriptor).trim()

  // Bare xpub -> wpkh
  if (/^[xyuvt]pub/.test(desc)) {
    const parsed = parseKeyExpr(desc)
    return { type: 'wpkh', ...parsed }
  }

  // tr(xpub...)
  let m = desc.match(/^tr\(([^)]*)\)$/)
  if (m) {
    const parsed = parseKeyExpr(m[1])
    return { type: 'tr', ...parsed }
  }

  // wpkh(xpub...)
  m = desc.match(/^wpkh\(([^)]*)\)$/)
  if (m) {
    const parsed = parseKeyExpr(m[1])
    return { type: 'wpkh', ...parsed }
  }

  // pkh(xpub...)
  m = desc.match(/^pkh\(([^)]*)\)$/)
  if (m) {
    const parsed = parseKeyExpr(m[1])
    return { type: 'pkh', ...parsed }
  }

  // sh(wpkh(xpub...))
  m = desc.match(/^sh\(wpkh\(([^)]*)\)\)$/)
  if (m) {
    const parsed = parseKeyExpr(m[1])
    return { type: 'shwpkh', ...parsed }
  }

  // wsh(sortedmulti(M,key1,key2,...)) — P2WSH multisig
  m = desc.match(/^wsh\(sortedmulti\((\d+),(.*)\)\)$/)
  if (m) {
    const M = parseInt(m[1], 10)
    const keyExprs = m[2].split(/,(?![^[]*\])/) // split on commas not inside [origin]
    const parsedKeys = keyExprs.map((ke) => parseKeyExpr(ke.trim()))
    return { type: 'wsh', M, keys: parsedKeys, paths: parsedKeys[0].paths }
  }

  throw new Error(`Unsupported descriptor format: ${descriptor}`)
}

/** Derive address at index i for a parsed descriptor node.
 *  Handles multipaths (<0;1>), trailing /N paths, and multisig.
 *
 *  IMPORTANT: the origin path ([fp/.../N]) is NOT re-applied here — the xpub
 *  string already encodes its own depth (BIP32). The descriptor's origin is
 *  informational metadata. The <0;1> branch and * index derive DIRECTLY from
 *  the xpub. Re-applying the origin double-derives and produces wrong
 *  addresses (verified: funded address found at direct branch 0 index 136). */
function deriveAddress(parsed, i) {
  if (parsed.type === 'wsh') {
    // Multisig: each key's xpub -> branch -> index, sort pubkeys, redeem.
    const pubkeys = parsed.keys.map((k) => {
      let node = bip32.fromBase58(k.xpub)
      const branch = k.trailing || `/${(k.paths && k.paths[0]) || '0'}`
      if (branch) node = derivePath(node, branch)
      return node.derive(i).publicKey
    })
    pubkeys.sort(Buffer.compare)
    const redeem = bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: parsed.M, pubkeys, network: NETWORK }),
      network: NETWORK,
    })
    return redeem.address
  }

  let node = bip32.fromBase58(parsed.xpub)

  // The trailing path before the wildcard is the account/change level;
  // use path 0 (or the multipath branch 0) by default. Origin NOT applied.
  const branch = (parsed.trailing || '') ? parsed.trailing : (parsed.paths && parsed.paths[0] ? `/${parsed.paths[0]}` : '')
  if (branch) node = derivePath(node, branch)

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

/** Build a scantxoutset descriptor for a parsed wallet descriptor.
 *  e.g. wpkh(xpub/0/*) or wsh(sortedmulti(2,xpub1/0/*,xpub2/0/*,...))
 *  with an explicit range so one RPC call scans the whole wallet. */
function buildScanDescriptor(parsed, branch) {
  const path = `/${branch}/*`
  switch (parsed.type) {
    case 'wsh': {
      const keys = parsed.keys
        .map((k) => k.xpub + path)
        .join(',')
      return `wsh(sortedmulti(${parsed.M},${keys}))`
    }
    case 'tr':
      return `tr(${parsed.xpub}${path})`
    case 'pkh':
      return `pkh(${parsed.xpub}${path})`
    case 'shwpkh':
      return `sh(wpkh(${parsed.xpub}${path}))`
    case 'wpkh':
    default:
      return `wpkh(${parsed.xpub}${path})`
  }
}

const SCAN_RANGE = 500 // explicit scan window per branch — covers sparse wallets, scans in seconds

/** Query the whole wallet balance via Bitcoin Core RPC scantxoutset.
 *  First aborts any stale scan (from a timed-out prior request), then starts
 *  a fresh scan with a sane range. One call, no wallet import needed. */
async function balanceFromBitcoind(parsed) {
  let auth
  try {
    const fs = await import('node:fs')
    // The whole-volume mount resolves the chain-data dir directly at the
    // mountpoint, so the cookie is at /mnt/bitcoind/.cookie (not main/.cookie).
    const cookie = fs.readFileSync('/mnt/bitcoind/.cookie', 'utf8').trim()
    const [user, pass] = cookie.split(':')
    auth = Buffer.from(`${user}:${pass}`).toString('base64')
  } catch (e) {
    console.error(`Could not read bitcoind cookie: ${e.message}`)
    return null
  }

  const rpc = async (method, params) => {
    const res = await fetch(`${BITCOIND_RPC}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ jsonrpc: '1.0', id: 'wallet-helper', method, params }),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error(`bitcoind RPC error ${method}: ${res.status} ${txt.slice(0, 160)}`)
      return null
    }
    const data = await res.json()
    if (data.error) {
      console.error(`bitcoind RPC error ${method}: ${JSON.stringify(data.error)}`)
      return null
    }
    return data.result
  }

  // Abort any stale scan left by a timed-out prior request
  try { await rpc('scantxoutset', ['abort']) } catch {}

  const branches = parsed.paths && parsed.paths.length ? parsed.paths : ['0']
  const scanObjects = branches.map((b) => ({
    desc: buildScanDescriptor(parsed, b),
    range: SCAN_RANGE,
  }))

  const result = await rpc('scantxoutset', ['start', scanObjects])
  if (result && result.total_amount !== undefined) {
    return Math.round(result.total_amount * 1e8)
  }
  return null
}

const GAP_LIMIT = 20 // legacy gap limit, unused with explicit-window scan
const DEFAULT_RANGE = 200 // mempool fallback window per branch (rate-limit friendly)

/** Query an address's activity (tx count) + balance from mempool.space. */
async function addrInfoFromMempool(address) {
  const url = `${MEMPOOL_API}/address/${address}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`mempool ${res.status} for ${address}`)
  const data = await res.json()
  const stats = data.chain_stats || {}
  const mempool = data.mempool_stats || {}
  const bal = (stats.funded_txo_sum || 0) - (stats.spent_txo_sum || 0) +
              (mempool.funded_txo_sum || 0) - (mempool.spent_txo_sum || 0)
  const txCount = (stats.tx_count || 0) + (mempool.tx_count || 0)
  return { balanceSats: bal, txCount }
}

let scanStatus = { scanning: false, member: '', lastScanAt: null }

async function handle(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    // Scan status endpoint (used by the StartOS health check)
    if (url.pathname === '/api/scan-status') {
      res.writeHead(200)
      res.end(JSON.stringify(scanStatus))
      return
    }

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
        scanStatus = { scanning: true, member: w.memberName, lastScanAt: scanStatus.lastScanAt }
        const parsed = parseDescriptor(w.descriptor)
        let balanceSats = null
        let source = 'mempool'
        let addresses = []
        let lastUsedIndex = -1

        // Prefer Bitcoin Core: one scantxoutset call scans the whole wallet
        // descriptor range (both branches, up to 10000 addresses each).
        if (BITCOIND_RPC) {
          const r = await balanceFromBitcoind(parsed)
          if (r !== null) {
            balanceSats = r
            source = 'bitcoind'
          }
        }

        if (balanceSats === null) {
          // Public fallback: explicit-window scan (like importdescriptors
          // range [0, N]) — derive DEFAULT_RANGE addresses per branch and
          // query balances in parallel. No gap heuristic; finds sparse funds.
          const branches = parsed.paths && parsed.paths.length ? parsed.paths : ['0']
          for (const branch of branches) {
            const branchParsed = { ...parsed, trailing: `/${branch}` }
            const batchSize = 20
            for (let i = 0; i < DEFAULT_RANGE; i += batchSize) {
              const batchAddrs = []
              for (let k = 0; k < batchSize && i + k < DEFAULT_RANGE; k++) {
                batchAddrs.push(deriveAddress(branchParsed, i + k))
              }
              const infos = await Promise.all(
                batchAddrs.map((a) => addrInfoFromMempool(a).catch(() => ({ balanceSats: 0, txCount: 0 }))),
              )
              for (let k = 0; k < infos.length; k++) {
                balanceSats += infos[k].balanceSats
                if (infos[k].txCount > 0) lastUsedIndex = Math.max(lastUsedIndex, i + k)
              }
              addresses.push(...batchAddrs)
              // Small delay between batches to respect mempool.space rate limits
              await new Promise((r) => setTimeout(r, 150))
            }
          }
        }

        results.push({
          memberName: w.memberName,
          descriptor: w.descriptor,
          balanceSats,
          addresses,
          lastUsedIndex,
          source,
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

    scanStatus = { scanning: false, member: '', lastScanAt: new Date().toISOString() }

    res.writeHead(200)
    res.end(JSON.stringify({ wallets: results }))
  } catch (e) {
    scanStatus = { scanning: false, member: '', lastScanAt: new Date().toISOString() }
    res.writeHead(500)
    res.end(JSON.stringify({ error: e.message }))
  }
}

http.createServer(handle).listen(PORT, () => {
  console.log(`wallet-helper listening on :${PORT} (bitcoind: ${BITCOIND_RPC || 'none -> mempool'})`)
})
