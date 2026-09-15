/**
 * KNIX CONTRACT CONFIGURATION
 * ===========================
 * The single place to register deployed contracts.
 *
 * Values can be edited here directly, or supplied at build time through VITE_*
 * environment variables (see .env.example). Env values win.
 *
 * An empty (or zero) address means "not deployed": the UI then shows a pending
 * state instead of fake data.
 *
 * Never put private keys or secrets in this file. It ships to the browser.
 */

import { activeNetwork } from './network.js';

const env = import.meta.env;
const pick = (envValue, fallback) => (envValue ?? '').trim() || fallback;

/**
 * Per network address book, copied from knix-contracts/deployments/<network>.json.
 * Robinhood Chain mainnet deployment: 2026-09-16.
 */
const ADDRESS_BOOK = {
  mainnet: {
    // Knix core: deposits, withdrawals, the market clock.
    KNIX_CORE_ADDRESS: '0x3DD411C10ffa55Bb13B54e289de6aA7e3c3A03a0',
    // Read only batching helper.
    KNIX_LENS_ADDRESS: '0x0E0f6eE839e58462Ece17C06E9A6dA4Bc2aa7eD4',
    // $KNIX token. No token exists yet, so the CA section stays on Coming Soon.
    KNIX_TOKEN_ADDRESS: '',
  },
  testnet: {
    KNIX_CORE_ADDRESS: '',
    KNIX_LENS_ADDRESS: '',
    KNIX_TOKEN_ADDRESS: '',
  },
};

const book = ADDRESS_BOOK[activeNetwork.key] || ADDRESS_BOOK.mainnet;

export const CONTRACTS = {
  KNIX_CORE_ADDRESS: pick(env.VITE_KNIX_CORE_ADDRESS, book.KNIX_CORE_ADDRESS),
  KNIX_LENS_ADDRESS: pick(env.VITE_KNIX_LENS_ADDRESS, book.KNIX_LENS_ADDRESS),
  KNIX_TOKEN_ADDRESS: pick(env.VITE_KNIX_TOKEN_ADDRESS, book.KNIX_TOKEN_ADDRESS),
};

/**
 * Cooldown choices offered in the UI. The contract enforces its own bounds
 * (10 minutes to 24 hours) and the app reads the real ones on load.
 */
export const COOLDOWN_OPTIONS = [
  { label: '10 min', seconds: 600 },
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
];

export const CHAIN_ID = activeNetwork.chainId;
export const RPC_URL = activeNetwork.rpcUrl;
export const BLOCK_EXPLORER_URL = activeNetwork.blockExplorerUrl;
