/**
 * KNIX CONTRACT CONFIGURATION
 * ===========================
 * The single place to register deployed contracts.
 *
 * Leave a value as '' until that contract is deployed. The UI detects empty
 * (or zero) addresses and shows a pending state instead of fake data.
 *
 * Values can be filled here directly, or supplied at build time through
 * VITE_* environment variables (see .env.example). Env values win.
 *
 * Never put private keys or secrets in this file. It ships to the browser.
 */

import { activeNetwork } from './network.js';

const env = import.meta.env;
const pick = (envValue, fallback) => (envValue ?? '').trim() || fallback;

/** Per network address book. Fill the block that matches your deployment. */
const ADDRESS_BOOK = {
  mainnet: {
    KNIX_TOKEN_ADDRESS: '',
    POOL_ADDRESS: '',
    POOL_ASSET_A_ADDRESS: '',
    POOL_ASSET_B_ADDRESS: '',
    ROUTER_ADDRESS: '',
    VAULT_ADDRESS: '',
    STAKING_ADDRESS: '',
    GOVERNOR_ADDRESS: '',
  },
  testnet: {
    KNIX_TOKEN_ADDRESS: '',
    POOL_ADDRESS: '',
    POOL_ASSET_A_ADDRESS: '',
    POOL_ASSET_B_ADDRESS: '',
    ROUTER_ADDRESS: '',
    VAULT_ADDRESS: '',
    STAKING_ADDRESS: '',
    GOVERNOR_ADDRESS: '',
  },
};

const book = ADDRESS_BOOK[activeNetwork.key] || ADDRESS_BOOK.mainnet;

export const CONTRACTS = {
  KNIX_TOKEN_ADDRESS: pick(env.VITE_KNIX_TOKEN_ADDRESS, book.KNIX_TOKEN_ADDRESS),
  POOL_ADDRESS: pick(env.VITE_POOL_ADDRESS, book.POOL_ADDRESS),
  POOL_ASSET_A_ADDRESS: pick(env.VITE_POOL_ASSET_A_ADDRESS, book.POOL_ASSET_A_ADDRESS),
  POOL_ASSET_B_ADDRESS: pick(env.VITE_POOL_ASSET_B_ADDRESS, book.POOL_ASSET_B_ADDRESS),
  ROUTER_ADDRESS: pick(env.VITE_ROUTER_ADDRESS, book.ROUTER_ADDRESS),
  VAULT_ADDRESS: pick(env.VITE_VAULT_ADDRESS, book.VAULT_ADDRESS),
  STAKING_ADDRESS: pick(env.VITE_STAKING_ADDRESS, book.STAKING_ADDRESS),
  GOVERNOR_ADDRESS: pick(env.VITE_GOVERNOR_ADDRESS, book.GOVERNOR_ADDRESS),
};

/**
 * Display metadata for the pool pair. These are labels only; the pool reads
 * real symbol and decimals from chain once the asset addresses are set.
 */
export const POOL_PAIR = {
  assetA: {
    symbol: pick(env.VITE_POOL_ASSET_A_SYMBOL, 'KNIX'),
    name: 'Knix',
    decimals: 18,
    address: CONTRACTS.POOL_ASSET_A_ADDRESS,
  },
  assetB: {
    symbol: pick(env.VITE_POOL_ASSET_B_SYMBOL, 'ETH'),
    name: 'Ether',
    decimals: 18,
    address: CONTRACTS.POOL_ASSET_B_ADDRESS,
  },
};

export const CHAIN_ID = activeNetwork.chainId;
export const RPC_URL = activeNetwork.rpcUrl;
export const BLOCK_EXPLORER_URL = activeNetwork.blockExplorerUrl;
