/**
 * Wallet store.
 *
 * With a WalletConnect project id (src/config/wallet.js) connections go through
 * Reown AppKit: browser extensions, WalletConnect QR and mobile wallets. AppKit is
 * loaded lazily. Without a project id the store falls back to the injected
 * EIP-1193 wallet (window.ethereum).
 *
 * Real wallet interaction only: connect, chain detection, network switching, sending.
 */
import { activeNetwork, chainIdHex } from '../config/network.js';
import { WALLETCONNECT_PROJECT_ID } from '../config/wallet.js';

const listeners = new Set();

const state = {
  available: false,
  account: '',
  chainId: 0,
  connecting: false,
  error: '',
};

const kitEnabled = Boolean(WALLETCONNECT_PROJECT_ID);
const injected = () => (typeof window !== 'undefined' ? window.ethereum : undefined);

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

/* ───────── AppKit (WalletConnect) ───────── */

let kit = null;
let kitPromise = null;

function loadKit() {
  if (!kitPromise) {
    kitPromise = Promise.all([import('./appkit.js'), import('@wagmi/core')])
      .then(([appkit, core]) => {
        kit = { ...appkit, core };
        const sync = (account) =>
          set({ account: account.address || '', chainId: account.chainId || 0 });
        sync(core.getAccount(appkit.wagmiConfig));
        core.watchAccount(appkit.wagmiConfig, { onChange: sync });
        appkit.modal.subscribeState(({ open }) => set({ connecting: Boolean(open) && !state.account }));
        return kit;
      })
      .catch((err) => {
        kitPromise = null;
        set({ error: 'Wallet modal failed to load' });
        throw err;
      });
  }
  return kitPromise;
}

/* ───────── Injected fallback ───────── */

function initInjected() {
  const eth = injected();
  set({ available: Boolean(eth) });
  if (!eth) return;
  eth.on?.('accountsChanged', (accounts) => set({ account: accounts?.[0] || '' }));
  eth.on?.('chainChanged', (id) => set({ chainId: Number.parseInt(id, 16) || 0 }));
  Promise.all([eth.request({ method: 'eth_accounts' }), eth.request({ method: 'eth_chainId' })])
    .then(([accounts, id]) => set({ account: accounts?.[0] || '', chainId: Number.parseInt(id, 16) || 0 }))
    .catch(() => {
      /* wallet locked or unavailable; stay disconnected */
    });
}

async function switchInjected(eth) {
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

/* ───────── Public API ───────── */

let initialised = false;

/**
 * @param {{ eager?: boolean }} options eager loads AppKit once the page is idle so a
 * previous session is restored. Pages that only need a wallet on demand pass
 * eager: false and call preloadWallet() when a wallet surface comes into view.
 */
export function initWallet({ eager = true } = {}) {
  if (!initialised) {
    initialised = true;
    if (kitEnabled) set({ available: true });
    else initInjected();
  }
  if (eager) preloadWallet();
}

/** Start loading AppKit in the background. No effect without a project id. */
export function preloadWallet() {
  if (!kitEnabled || kitPromise) return;
  const go = () => loadKit().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 200);
}

export async function connectWallet() {
  set({ error: '' });
  if (kitEnabled) {
    try {
      const { modal } = await loadKit();
      await modal.open({ view: 'Connect' });
    } catch {
      /* loadKit already recorded the error */
    }
    return;
  }
  const eth = injected();
  if (!eth) return set({ error: 'No wallet detected' });
  set({ connecting: true });
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

export async function disconnectWallet() {
  if (kit) return kit.modal.disconnect();
  // EIP-1193 has no disconnect; clear the local session only.
  set({ account: '' });
}

export async function switchToActiveNetwork() {
  set({ error: '' });
  if (kit && state.account) {
    try {
      await kit.core.switchChain(kit.wagmiConfig, { chainId: activeNetwork.chainId });
    } catch (err) {
      set({ error: /reject|denied/i.test(err?.message || '') ? 'Request declined' : 'Network switch failed' });
    }
    return;
  }
  const eth = injected();
  if (eth) return switchInjected(eth);
  if (kitEnabled) return connectWallet();
}

/** Send a transaction from the connected account. Resolves with the hash. */
export async function sendTransaction({ to, data, value = 0n }) {
  if (kit && state.account) {
    return kit.core.sendTransaction(kit.wagmiConfig, {
      account: state.account,
      chainId: activeNetwork.chainId,
      to,
      data,
      value,
    });
  }
  const eth = injected();
  if (!eth) throw new Error('No wallet detected');
  const tx = { from: state.account, to, data };
  if (value > 0n) tx.value = `0x${value.toString(16)}`;
  return eth.request({ method: 'eth_sendTransaction', params: [tx] });
}
