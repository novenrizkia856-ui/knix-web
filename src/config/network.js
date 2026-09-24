/**
 * Knix network configuration.
 *
 * Every chain parameter the app uses lives here. Application code imports
 * `activeNetwork` and never references an RPC string or chain id directly.
 *
 * Switch networks with VITE_KNIX_NETWORK=mainnet | testnet (see .env.example).
 */

const env = import.meta.env;

export const NETWORKS = {
  mainnet: {
    key: 'mainnet',
    name: 'Robinhood Chain',
    shortName: 'Robinhood Chain',
    chainId: 4663,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: env.VITE_RPC_URL_MAINNET || 'https://rpc.mainnet.chain.robinhood.com',
    blockExplorerUrl: env.VITE_BLOCK_EXPLORER_URL_MAINNET || 'https://robinhoodchain.blockscout.com',
    testnet: false,
  },
  testnet: {
    key: 'testnet',
    name: 'Robinhood Chain Testnet',
    shortName: 'RH Testnet',
    chainId: 46630,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    // Fill these with the official testnet endpoints (or set them in .env).
    rpcUrl: env.VITE_RPC_URL_TESTNET || '',
    blockExplorerUrl: env.VITE_BLOCK_EXPLORER_URL_TESTNET || '',
    testnet: true,
  },
};

const requested = (env.VITE_KNIX_NETWORK || 'mainnet').toLowerCase();

export const activeNetwork = NETWORKS[requested] || NETWORKS.mainnet;

export const chainIdHex = (chainId = activeNetwork.chainId) => `0x${chainId.toString(16)}`;

/** Explorer link helper. Returns '' when the network has no explorer configured. */
export function explorerUrl(kind, value, network = activeNetwork) {
  if (!network.blockExplorerUrl || !value) return '';
  const base = network.blockExplorerUrl.replace(/\/$/, '');
  return `${base}/${kind}/${value}`;
}
