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

const ADDR_SCAN = 25 // derive this many addresses per descriptor for now

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
 *  Handles key origins, multipaths (<0;1>), trailing /N paths, and multisig. */
function deriveAddress(parsed, i) {
  if (parsed.type === 'wsh') {
    // Multisig: derive each key's pubkey at index i, sort, redeem.
    // Path = origin (e.g. 45h/0h/1h/0) + branch (<0;1> -> 0 or 1) + index.
    const pubkeys = parsed.keys.map((k) => {
      let node = bip32.fromBase58(k.xpub)
      if (k.originPath) node = derivePath(node, k.originPath)
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

  // Apply the key origin path (from [fp/.../N])
  if (parsed.originPath) node = derivePath(node, parsed.originPath)

  // The trailing path before the wildcard is the account/change level;
  // use path 0 (or the multipath branch 0) by default.
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

/** Query balance via Bitcoin Core RPC using scantxoutset (no wallet needed).
 *  Auth comes from the read-only mounted cookie at /mnt/bitcoind/.cookie
 *  (format: __cookie__:<password>) — no credentials in config. */
async function balanceFromBitcoind(addresses) {
  // Cookie path: the bitcoind main volume is mounted at /mnt/bitcoind
  let auth
  try {
    const fs = await import('node:fs')
    const cookie = fs.readFileSync('/mnt/bitcoind/.cookie', 'utf8').trim()
    // Format: __cookie__:<password>
    const [user, pass] = cookie.split(':')
    auth = Buffer.from(`${user}:${pass}`).toString('base64')
  } catch (e) {
    console.error(`Could not read bitcoind cookie: ${e.message}`)
    return null // fall back to mempool
  }

  // scantxoutset with a descriptor per address. Batch in one call.
  // Note: scans the UTXO set — no wallet import/rescan needed.
  const scanObjects = addresses.map((a) => ({
    desc: `addr(${a})`,
    range: 0,
  }))

  const body = JSON.stringify({
    jsonrpc: '1.0',
    id: 'wallet-helper',
    method: 'scantxoutset',
    params: ['start', scanObjects],
  })

  let res
  try {
    res = await fetch(`${BITCOIND_RPC}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body,
    })
  } catch (e) {
    console.error(`bitcoind RPC connect error: ${e.message}`)
    return null
  }
  if (!res.ok) {
    const txt = await res.text()
    console.error(`bitcoind RPC error: ${res.status} ${txt.slice(0, 120)}`)
    return null
  }
  const data = await res.json()
  if (data.error) {
    console.error(`bitcoind RPC error: ${JSON.stringify(data.error)}`)
    return null
  }
  // scantxoutset result: { success, total_amount, ... }
  if (data.result && data.result.total_amount !== undefined) {
    return Math.round(data.result.total_amount * 1e8)
  }
  return null
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
        // Derive from every multipath branch (external + change for <0;1>)
        const branches = parsed.paths && parsed.paths.length ? parsed.paths : ['0']
        for (const branch of branches) {
          const branchParsed = { ...parsed, trailing: `/${branch}` }
          for (let i = 0; i < ADDR_SCAN; i++) {
            addresses.push(deriveAddress(branchParsed, i))
          }
        }

        let balanceSats = null
        if (BITCOIND_RPC) {
          balanceSats = await balanceFromBitcoind(addresses)
        }
        if (balanceSats === null) {
          // Public fallback: query all addresses in parallel (mempool.space
          // handles bursts; parallel avoids the serial N×RTT timeout)
          const balances = await Promise.all(
            addresses.map((a) => balanceFromMempool(a).catch(() => 0)),
          )
          balanceSats = balances.reduce((a, b) => a + b, 0)
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
