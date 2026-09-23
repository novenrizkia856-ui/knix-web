import { activeNetwork } from '../config/solana.js';

/** Read only JSON-RPC call against the configured Solana cluster. Resolves null on failure. */
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

/** Latest confirmed slot from the public RPC, or null. */
export async function latestSlot() {
  const slot = await rpcCall('getSlot', [{ commitment: 'confirmed' }]);
  return typeof slot === 'number' ? slot : null;
}

/** SOL balance of `owner` in lamports, or null. */
export async function readSolBalance(owner) {
  const result = await rpcCall('getBalance', [owner, { commitment: 'confirmed' }]);
  return typeof result?.value === 'number' ? BigInt(result.value) : null;
}
