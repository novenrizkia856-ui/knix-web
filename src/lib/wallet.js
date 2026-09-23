/**
 * Wallet store for Solana.
 *
 * With a WalletConnect project id (src/config/wallet.js) connections go through
 * Reown AppKit: Phantom, Solflare, Backpack and any Wallet Standard wallet, plus
 * WalletConnect QR and mobile wallets. AppKit is loaded lazily. Without a project
 * id the store falls back to the injected Solana provider.
 *
 * Connection only: connect, disconnect, the public key. This store exposes no way
 * to sign or send a transaction.
 */
import { WALLETCONNECT_PROJECT_ID } from '../config/wallet.js';

const listeners = new Set();

const state = {
  available: false,
  account: '',
  connecting: false,
  error: '',
};

const kitEnabled = Boolean(WALLETCONNECT_PROJECT_ID);
const injected = () =>
  typeof window === 'undefined'
    ? undefined
    : window.phantom?.solana || window.solflare || window.backpack || window.solana;

function emit() {
  const snapshot = getWalletState();
  listeners.forEach((fn) => fn(snapshot));
}

function set(patch) {
  Object.assign(state, patch);
  emit();
}

export function getWalletState() {
  return { ...state, connected: Boolean(state.account) };
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
    kitPromise = import('./appkit.js')
      .then((appkit) => {
        kit = appkit;
        const sync = (account) =>
          set({
            account: account?.isConnected ? account.address || '' : '',
            connecting: account?.status === 'connecting' || (state.connecting && !account?.isConnected),
          });
        sync(appkit.modal.getAccount('solana'));
        appkit.modal.subscribeAccount(sync, 'solana');
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

const keyOf = (provider) => provider?.publicKey?.toString?.() || '';

function initInjected() {
  const provider = injected();
  set({ available: Boolean(provider) });
  if (!provider) return;
  provider.on?.('connect', () => set({ account: keyOf(provider) }));
  provider.on?.('disconnect', () => set({ account: '' }));
  provider.on?.('accountChanged', (key) => set({ account: key?.toString?.() || '' }));
  // Restores a session the user already approved; never opens a prompt.
  provider.connect?.({ onlyIfTrusted: true })
    .then(() => set({ account: keyOf(provider) }))
    .catch(() => {
      /* not trusted yet; stay disconnected */
    });
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
      await modal.open({ view: 'Connect', namespace: 'solana' });
    } catch {
      /* loadKit already recorded the error */
    }
    return;
  }
  const provider = injected();
  if (!provider) return set({ error: 'No Solana wallet detected' });
  set({ connecting: true });
  try {
    await provider.connect();
    set({ account: keyOf(provider) });
  } catch (err) {
    set({ error: err?.code === 4001 ? 'Request declined' : 'Connection failed' });
  } finally {
    set({ connecting: false });
  }
}

export async function disconnectWallet() {
  if (kit) return kit.modal.disconnect('solana');
  try {
    await injected()?.disconnect?.();
  } finally {
    set({ account: '' });
  }
}
