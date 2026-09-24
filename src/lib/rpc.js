import { activeNetwork } from '../config/network.js';

/** Read only JSON-RPC call against the configured network. Resolves null on failure. */
export async function rpcCall(method, params = [], { timeout = 6000, network = activeNetwork } = {}) {
  if (!network.rpcUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Latest block number from the public RPC, or null. */
export async function latestBlock() {
  const hex = await rpcCall('eth_blockNumber');
  return hex ? Number.parseInt(hex, 16) : null;
}
