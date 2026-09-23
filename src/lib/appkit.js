/**
 * Reown AppKit setup for Solana. Loaded lazily by wallet.js so the landing page stays light.
 * Covers Wallet Standard browser wallets (Phantom, Solflare, Backpack), WalletConnect QR
 * and mobile deep links. Used for connection only: send, swap and onramp are switched off.
 */
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { createAppKit } from '@reown/appkit';
import { solana, solanaDevnet } from '@reown/appkit/networks';
import { activeNetwork } from '../config/solana.js';
import { APP_METADATA, WALLETCONNECT_PROJECT_ID } from '../config/wallet.js';

// Reown wallet registry ids, shown first in the connect modal.
const FEATURED_WALLETS = [
  'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
  '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79', // Solflare
  '2bd8c14e035c2d48f184aaa168559e86b0e3433228d3c4075900a221785019b0', // Backpack
];

const cluster = activeNetwork.testnet ? solanaDevnet : solana;

// AppKit keys its own RPC with the project id; a custom endpoint from config replaces it.
export const network = {
  ...cluster,
  ...(activeNetwork.customRpc ? { rpcUrls: { default: { http: [activeNetwork.rpcUrl] } } } : {}),
  blockExplorers: { default: { name: 'Solana Explorer', url: activeNetwork.explorerUrl } },
};

export const adapter = new SolanaAdapter();

export const modal = createAppKit({
  adapters: [adapter],
  projectId: WALLETCONNECT_PROJECT_ID,
  networks: [network],
  defaultNetwork: network,
  metadata: { ...APP_METADATA, url: window.location.origin, icons: APP_METADATA.icons.map((p) => new URL(p, window.location.origin).href) },
  featuredWalletIds: FEATURED_WALLETS,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#ff2d42',
    '--w3m-color-mix': '#0a0707',
    '--w3m-color-mix-strength': 20,
    '--w3m-font-family': "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
    '--w3m-border-radius-master': '2px',
    '--w3m-z-index': 1000,
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    send: false,
    receive: false,
    history: false,
  },
});
