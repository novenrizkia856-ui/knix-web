/**
 * Knix contract client.
 *
 * Reads go to the public RPC (no wallet needed). Writes go through the connected
 * EIP-1193 wallet. Calldata is encoded by hand: the contract surface is small and
 * this keeps the bundle free of a web3 library.
 *
 * Selectors below were taken from the deployed contracts with `cast sig`.
 */
import { CONTRACTS } from '../config/contracts.js';
import { activeNetwork } from '../config/network.js';
import { isConfiguredAddress } from './address.js';
import { rpcCall } from './rpc.js';
import { getWalletState } from './wallet.js';

const SEL = {
  deposit: '0x0efe6a8b', // deposit(address,uint256,uint256)
  requestWithdrawal: '0x9ee679e8', // requestWithdrawal(uint256)
  cancelWithdrawal: '0x3efcfda4', // cancelWithdrawal(uint256)
  finalizeWithdrawal: '0x5e15c749', // finalizeWithdrawal(uint256)
  isMarketOpen: '0xd4ce85f3', // isMarketOpen()
  nextMarketOpen: '0xa0b601fb', // nextMarketOpen(uint256)
  getPosition: '0xeb02c301', // getPosition(uint256)
  positionsOf: '0xf867d46b', // positionsOf(address)
  positionCount: '0xe7702d05', // positionCount()
  minCooldown: '0xf714cb44', // MIN_COOLDOWN()
  maxCooldown: '0x8b41d35f', // MAX_COOLDOWN()
  balanceOf: '0x70a08231', // balanceOf(address)
  allowance: '0xdd62ed3e', // allowance(address,address)
  approve: '0x095ea7b3', // approve(address,uint256)
  decimals: '0x313ce567', // decimals()
  symbol: '0x95d89b41', // symbol()
};

export const STATUS = { ACTIVE: 0, PENDING: 1, CLOSED: 2 };
export const MAX_UINT256 = (1n << 256n) - 1n;

/* ───────── encoding ───────── */

const strip = (hex) => String(hex ?? '').replace(/^0x/, '');
const word = (hex) => strip(hex).padStart(64, '0');
const encUint = (value) => word(BigInt(value).toString(16));
const encAddress = (address) => word(address.toLowerCase().replace(/^0x/, ''));
const wordAt = (data, index) => strip(data).slice(index * 64, (index + 1) * 64);
const toBigInt = (hexWord) => (hexWord ? BigInt(`0x${hexWord}`) : 0n);
const toAddress = (hexWord) => `0x${hexWord.slice(24)}`;

/** Decode an ABI string, tolerating tokens that return bytes32 instead. */
function decodeString(data) {
  const body = strip(data);
  if (!body) return '';
  if (body.length === 64) {
    const bytes = body.replace(/(00)+$/, '');
    let out = '';
    for (let i = 0; i < bytes.length; i += 2) out += String.fromCharCode(parseInt(bytes.slice(i, i + 2), 16));
    return out.trim();
  }
  const length = Number(toBigInt(wordAt(body, 1)));
  const chars = body.slice(128, 128 + length * 2);
  let out = '';
  for (let i = 0; i < chars.length; i += 2) out += String.fromCharCode(parseInt(chars.slice(i, i + 2), 16));
  return out;
}

export function parseUnits(value, decimals = 18) {
  const [whole = '0', fraction = ''] = String(value).trim().split('.');
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

export function formatUnits(value, decimals = 18, precision = 6) {
  if (value == null) return '';
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/* ───────── addresses ───────── */

export const CORE = CONTRACTS.KNIX_CORE_ADDRESS;
export const LENS = CONTRACTS.KNIX_LENS_ADDRESS;

/** True once a Knix core address is configured for the active network. */
export const knixDeployed = () => isConfiguredAddress(CORE);

export const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value ?? '').trim());

/* ───────── reads (public RPC) ───────── */

const call = (to, data) => rpcCall('eth_call', [{ to, data }, 'latest']);

async function readUint(to, data) {
  const result = await call(to, data);
  return result && result !== '0x' ? toBigInt(wordAt(result, 0)) : null;
}

export async function readMarket() {
  if (!knixDeployed()) return null;
  const now = Math.floor(Date.now() / 1000);
  const [openRaw, nextRaw] = await Promise.all([
    call(CORE, SEL.isMarketOpen),
    call(CORE, SEL.nextMarketOpen + encUint(now)),
  ]);
  if (openRaw == null || nextRaw == null) return null;
  return { open: toBigInt(wordAt(openRaw, 0)) === 1n, nextOpen: Number(toBigInt(wordAt(nextRaw, 0))) };
}

export async function readCooldownBounds() {
  if (!knixDeployed()) return null;
  const [min, max] = await Promise.all([readUint(CORE, SEL.minCooldown), readUint(CORE, SEL.maxCooldown)]);
  return min == null || max == null ? null : { min: Number(min), max: Number(max) };
}

/** Position ids owned by `owner`, oldest first. */
export async function readPositionIds(owner) {
  if (!knixDeployed() || !isAddress(owner)) return [];
  const data = await call(CORE, SEL.positionsOf + encAddress(owner));
  if (!data || data === '0x') return [];
  const length = Number(toBigInt(wordAt(data, 1)));
  return Array.from({ length }, (_, i) => toBigInt(wordAt(data, 2 + i)));
}

export async function readPosition(id) {
  if (!knixDeployed()) return null;
  const data = await call(CORE, SEL.getPosition + encUint(id));
  if (!data || data === '0x') return null;
  return {
    id: BigInt(id),
    owner: toAddress(wordAt(data, 0)),
    token: toAddress(wordAt(data, 1)),
    amount: toBigInt(wordAt(data, 2)),
    cooldown: Number(toBigInt(wordAt(data, 3))),
    tip: toBigInt(wordAt(data, 4)),
    unlockTime: Number(toBigInt(wordAt(data, 5))),
    status: Number(toBigInt(wordAt(data, 6))),
  };
}

export async function readPositions(owner) {
  const ids = await readPositionIds(owner);
  const positions = await Promise.all(ids.map((id) => readPosition(id)));
  return positions.filter(Boolean);
}

/** Symbol and decimals for an ERC20, or null when the address is not a token. */
export async function readToken(token) {
  if (!isAddress(token)) return null;
  const [symbolRaw, decimalsRaw] = await Promise.all([call(token, SEL.symbol), call(token, SEL.decimals)]);
  if (decimalsRaw == null || decimalsRaw === '0x') return null;
  return {
    address: token,
    symbol: decodeString(symbolRaw) || 'TOKEN',
    decimals: Number(toBigInt(wordAt(decimalsRaw, 0))),
  };
}

export const readTokenBalance = (token, owner) =>
  isAddress(token) && isAddress(owner) ? readUint(token, SEL.balanceOf + encAddress(owner)) : Promise.resolve(null);

export const readAllowance = (token, owner) =>
  isAddress(token) && isAddress(owner)
    ? readUint(token, SEL.allowance + encAddress(owner) + encAddress(CORE))
    : Promise.resolve(null);

/* ───────── writes (wallet) ───────── */

function provider() {
  const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
  if (!eth) throw new Error('No wallet detected');
  return eth;
}

async function send({ to, data, value = 0n }) {
  const eth = provider();
  const { account, onActiveChain } = getWalletState();
  if (!account) throw new Error('Connect a wallet first');
  if (!onActiveChain) throw new Error(`Switch to ${activeNetwork.name}`);
  const tx = { from: account, to, data };
  if (value > 0n) tx.value = `0x${value.toString(16)}`;
  return eth.request({ method: 'eth_sendTransaction', params: [tx] });
}

/** Wait for a receipt. Resolves with it, or throws when the transaction reverted. */
export async function waitForTx(hash, { timeout = 120_000, interval = 2_000 } = {}) {
  const eth = provider();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const receipt = await eth.request({ method: 'eth_getTransactionReceipt', params: [hash] }).catch(() => null);
    if (receipt) {
      if (receipt.status && BigInt(receipt.status) === 0n) throw new Error('Transaction reverted');
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timed out waiting for confirmation');
}

export const approve = (token, amount = MAX_UINT256) =>
  send({ to: token, data: SEL.approve + encAddress(CORE) + encUint(amount) });

export const deposit = ({ token, amount, cooldown, tip = 0n }) =>
  send({
    to: CORE,
    data: SEL.deposit + encAddress(token) + encUint(amount) + encUint(cooldown),
    value: BigInt(tip),
  });

export const requestWithdrawal = (id) => send({ to: CORE, data: SEL.requestWithdrawal + encUint(id) });
export const cancelWithdrawal = (id) => send({ to: CORE, data: SEL.cancelWithdrawal + encUint(id) });
export const finalizeWithdrawal = (id) => send({ to: CORE, data: SEL.finalizeWithdrawal + encUint(id) });

/** Wallet errors are verbose; surface something a person can read. */
export function describeError(error) {
  const message = error?.data?.message || error?.message || 'Transaction failed';
  if (error?.code === 4001 || /user rejected/i.test(message)) return 'Request declined';
  if (/insufficient funds/i.test(message)) return 'Not enough ETH for gas';
  if (/NotOwner/.test(message)) return 'That position belongs to another wallet';
  if (/NotActive/.test(message)) return 'Position is not active';
  if (/NotPending/.test(message)) return 'No withdrawal queued for that position';
  if (/StillLocked/.test(message)) return 'Still locked, try again after the unlock time';
  if (/AlreadyUnlocked/.test(message)) return 'Already unlocked, finalize it instead';
  if (/InvalidCooldown/.test(message)) return 'Cooldown is outside the allowed range';
  if (/NothingReceived/.test(message)) return 'The token moved nothing on transfer';
  return message.length > 140 ? `${message.slice(0, 140)}…` : message;
}
