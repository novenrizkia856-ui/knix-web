/**
 * Pool contract adapter.
 *
 * The UI talks to the pool only through this module. Once the pool contract
 * exists, implement the write paths here with its real ABI. Nothing else in
 * the interface needs to change.
 *
 * Reads use standard ERC-20 selectors and run only when addresses are set.
 */
import { CONTRACTS, POOL_PAIR } from '../config/contracts.js';
import { isConfiguredAddress } from './address.js';
import { rpcCall } from './rpc.js';

const SELECTOR = {
  balanceOf: '0x70a08231',
  totalSupply: '0x18160ddd',
};

const pad = (address) => address.toLowerCase().replace(/^0x/, '').padStart(64, '0');

async function callUint(to, data) {
  const hex = await rpcCall('eth_call', [{ to, data }, 'latest']);
  if (!hex || hex === '0x') return null;
  try {
    return BigInt(hex);
  } catch {
    return null;
  }
}

export function poolReadiness() {
  const pool = isConfiguredAddress(CONTRACTS.POOL_ADDRESS);
  const assetA = isConfiguredAddress(POOL_PAIR.assetA.address);
  const assetB = isConfiguredAddress(POOL_PAIR.assetB.address);
  return { pool, assetA, assetB, ready: pool && assetA && assetB };
}

/** ERC-20 balance for a configured token, or null. */
export async function readTokenBalance(token, account) {
  if (!isConfiguredAddress(token) || !account) return null;
  return callUint(token, SELECTOR.balanceOf + pad(account));
}

/** Pool share token balance and total supply for an account. */
export async function readPosition(account) {
  if (!isConfiguredAddress(CONTRACTS.POOL_ADDRESS)) return null;
  const [supply, balance] = await Promise.all([
    callUint(CONTRACTS.POOL_ADDRESS, SELECTOR.totalSupply),
    account ? callUint(CONTRACTS.POOL_ADDRESS, SELECTOR.balanceOf + pad(account)) : null,
  ]);
  if (supply == null) return null;
  return { supply, balance: balance ?? 0n };
}

/** Pool holdings of each asset (ERC-20 balanceOf on the pool). */
export async function readReserves() {
  const { pool, assetA, assetB } = poolReadiness();
  if (!pool || !assetA || !assetB) return null;
  const [a, b] = await Promise.all([
    callUint(POOL_PAIR.assetA.address, SELECTOR.balanceOf + pad(CONTRACTS.POOL_ADDRESS)),
    callUint(POOL_PAIR.assetB.address, SELECTOR.balanceOf + pad(CONTRACTS.POOL_ADDRESS)),
  ]);
  if (a == null || b == null) return null;
  return { a, b };
}

export class PoolUnavailableError extends Error {
  constructor(message = 'Pool contract not configured') {
    super(message);
    this.name = 'PoolUnavailableError';
  }
}

/**
 * Write paths. Replace the bodies with real encoded calls once the ABI is final.
 * They intentionally never simulate success.
 */
export async function deposit(/* { amountA, amountB, account } */) {
  if (!poolReadiness().ready) throw new PoolUnavailableError();
  throw new PoolUnavailableError('Deposit integration not implemented');
}

export async function withdraw(/* { shareBps, account } */) {
  if (!poolReadiness().ready) throw new PoolUnavailableError();
  throw new PoolUnavailableError('Withdraw integration not implemented');
}
