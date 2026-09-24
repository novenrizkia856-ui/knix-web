/**
 * Reown AppKit setup. Loaded lazily by wallet.js so the landing page stays light.
 * Covers browser extensions (EIP-6963), WalletConnect QR and mobile deep links.
 */
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit';
import { defineChain } from '@reown/appkit/networks';
import { http } from '@wagmi/core';
import { activeNetwork } from '../config/network.js';
import { APP_METADATA, WALLETCONNECT_PROJECT_ID } from '../config/wallet.js';

export const network = defineChain({
  id: activeNetwork.chainId,
  caipNetworkId: `eip155:${activeNetwork.chainId}`,
  chainNamespace: 'eip155',
  name: activeNetwork.name,
  nativeCurrency: activeNetwork.nativeCurrency,
  rpcUrls: { default: { http: [activeNetwork.rpcUrl] } },
  blockExplorers: activeNetwork.blockExplorerUrl
    ? { default: { name: 'Blockscout', url: activeNetwork.blockExplorerUrl } }
    : undefined,
  testnet: activeNetwork.testnet,
});

export const adapter = new WagmiAdapter({
  projectId: WALLETCONNECT_PROJECT_ID,
  networks: [network],
  transports: { [network.id]: http(activeNetwork.rpcUrl) },
});

export const wagmiConfig = adapter.wagmiConfig;

export const modal = createAppKit({
  adapters: [adapter],
  projectId: WALLETCONNECT_PROJECT_ID,
  networks: [network],
  defaultNetwork: network,
  metadata: { ...APP_METADATA, url: window.location.origin, icons: APP_METADATA.icons.map((p) => new URL(p, window.location.origin).href) },
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
