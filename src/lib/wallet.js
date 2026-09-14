/**
 * Minimal EIP-1193 wallet store. No dependencies.
 * Real wallet interaction only: connect, chain detection, network switching.
 */
import { activeNetwork, chainIdHex } from '../config/network.js';

const listeners = new Set();

const state = {
  available: false,
  account: '',
  chainId: 0,
  connecting: false,
  error: '',
};

const provider = () => (typeof window !== 'undefined' ? window.ethereum : undefined);

function emit() {
  const snapshot = getWalletState();
  listeners.forEach((fn) => fn(snapshot));
}

function set(patch) {
  Object.assign(state, patch);
  emit();
}

export function getWalletState() {
  return {
    ...state,
    connected: Boolean(state.account),
    onActiveChain: state.chainId === activeNetwork.chainId,
  };
}

export function subscribeWallet(fn) {
  listeners.add(fn);
  fn(getWalletState());
  return () => listeners.delete(fn);
}

let initialised = false;

export async function initWallet() {
  if (initialised) return;
  initialised = true;
  const eth = provider();
  set({ available: Boolean(eth) });
  if (!eth) return;

  eth.on?.('accountsChanged', (accounts) => set({ account: accounts?.[0] || '' }));
  eth.on?.('chainChanged', (id) => set({ chainId: Number.parseInt(id, 16) || 0 }));

  try {
    const [accounts, id] = await Promise.all([
      eth.request({ method: 'eth_accounts' }),
      eth.request({ method: 'eth_chainId' }),
    ]);
    set({ account: accounts?.[0] || '', chainId: Number.parseInt(id, 16) || 0 });
  } catch {
    /* wallet locked or unavailable; stay disconnected */
  }
}

export async function connectWallet() {
  const eth = provider();
  if (!eth) {
    set({ error: 'No wallet detected' });
    return;
  }
  set({ connecting: true, error: '' });
  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    const id = await eth.request({ method: 'eth_chainId' });
    set({ account: accounts?.[0] || '', chainId: Number.parseInt(id, 16) || 0 });
  } catch (err) {
    set({ error: err?.code === 4001 ? 'Request declined' : 'Connection failed' });
  } finally {
    set({ connecting: false });
  }
}

export function disconnectWallet() {
  // EIP-1193 has no disconnect; clear local session only.
  set({ account: '' });
}

export async function switchToActiveNetwork() {
  const eth = provider();
  if (!eth) return;
  const chainId = chainIdHex();
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
  } catch (err) {
    if (err?.code !== 4902 || !activeNetwork.rpcUrl) {
      set({ error: err?.code === 4001 ? 'Request declined' : 'Network switch failed' });
      return;
    }
    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId,
          chainName: activeNetwork.name,
          nativeCurrency: activeNetwork.nativeCurrency,
          rpcUrls: [activeNetwork.rpcUrl],
          blockExplorerUrls: activeNetwork.blockExplorerUrl ? [activeNetwork.blockExplorerUrl] : [],
        }],
      });
    } catch {
      set({ error: 'Network add failed' });
    }
  }
}

/** Native balance in wei as bigint, or null when unavailable. */
export async function getNativeBalance(account = state.account) {
  const eth = provider();
  if (!eth || !account) return null;
  try {
    return BigInt(await eth.request({ method: 'eth_getBalance', params: [account, 'latest'] }));
  } catch {
    return null;
  }
}

export function formatUnits(value, decimals = 18, precision = 4) {
  if (value == null) return '';
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
