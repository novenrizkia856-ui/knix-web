/**
 * KNIX SOLANA CONFIGURATION
 * =========================
 * The single place for every Solana parameter the app uses: cluster, RPC,
 * explorer and the Knix accounts (program, token mint, treasury). Application
 * code imports from here and never references an RPC string or address directly.
 *
 * Values can be edited here directly, or supplied at build time through VITE_*
 * environment variables (see .env.example). Env values win.
 *
 * An empty address means "not deployed": the UI then shows a pending state
 * instead of fake data. Never put private keys or secrets in this file. It ships
 * to the browser.
 */

import { WALLETCONNECT_PROJECT_ID } from './wallet.js';

const env = import.meta.env;
const pick = (envValue, fallback = '') => (envValue ?? '').trim() || fallback;

export const NETWORKS = {
  'mainnet-beta': {
    key: 'mainnet-beta',
    name: 'Solana',
    shortName: 'Solana',
    clusterLabel: 'Mainnet Beta',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    caipNetworkId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    publicRpcUrl: 'https://api.mainnet-beta.solana.com',
    testnet: false,
  },
  devnet: {
    key: 'devnet',
    name: 'Solana Devnet',
    shortName: 'Devnet',
    clusterLabel: 'Devnet',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    caipNetworkId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    publicRpcUrl: 'https://api.devnet.solana.com',
    testnet: true,
  },
};

const requested = pick(env.VITE_SOLANA_NETWORK, 'mainnet-beta').toLowerCase();
const base = NETWORKS[requested === 'mainnet' ? 'mainnet-beta' : requested] || NETWORKS['mainnet-beta'];

export const EXPLORER_BASE_URL = pick(env.VITE_SOLANA_EXPLORER_URL, 'https://explorer.solana.com').replace(/\/$/, '');

/**
 * RPC used for reads. The public Solana endpoints refuse browser requests (403),
 * so without VITE_SOLANA_RPC_URL the app reads through the Reown RPC, keyed by the
 * public WalletConnect project id (same domain allowlist as the wallet modal).
 * Set VITE_SOLANA_RPC_URL to a managed endpoint (Helius, Triton, QuickNode...) in production.
 */
const defaultRpc = WALLETCONNECT_PROJECT_ID
  ? `https://rpc.walletconnect.org/v1/?chainId=${base.caipNetworkId}&projectId=${WALLETCONNECT_PROJECT_ID}`
  : base.publicRpcUrl;

export const activeNetwork = {
  ...base,
  rpcUrl: pick(env.VITE_SOLANA_RPC_URL, defaultRpc),
  customRpc: Boolean(pick(env.VITE_SOLANA_RPC_URL)),
  explorerUrl: EXPLORER_BASE_URL,
};

/**
 * Knix accounts. No Knix program is deployed on Solana yet, so these stay
 * empty until real addresses exist. Do not fill them with placeholders.
 */
export const ACCOUNTS = {
  // Knix program id: locks, withdrawals, the market clock.
  PROGRAM_ID: pick(env.VITE_KNIX_PROGRAM_ID),
  // $KNIX SPL token mint. Empty keeps the CA section on Coming Soon.
  TOKEN_MINT: pick(env.VITE_KNIX_TOKEN_MINT),
  // Protocol treasury.
  TREASURY_ADDRESS: pick(env.VITE_KNIX_TREASURY_ADDRESS),
};

/**
 * Cooldown choices offered in the UI. The Knix program will enforce its own
 * bounds once it exists.
 */
export const COOLDOWN_OPTIONS = [
  { label: '10 min', seconds: 600 },
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
];

/**
 * Solana Explorer link. `kind` is 'address' (wallets, programs, mints) or 'tx'
 * (transaction signatures). Returns '' when there is nothing to link.
 */
export function explorerUrl(kind, value, network = activeNetwork) {
  if (!network.explorerUrl || !value) return '';
  const cluster = network.key === 'mainnet-beta' ? '' : `?cluster=${network.key}`;
  return `${network.explorerUrl}/${kind}/${value}${cluster}`;
}
