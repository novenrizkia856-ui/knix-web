/**
 * Wallet connection configuration (Reown AppKit, formerly WalletConnect).
 *
 * Get a project id at https://dashboard.reown.com and set it as
 * VITE_WALLETCONNECT_PROJECT_ID (in .env locally, in the Vercel project settings
 * for production). Add every domain the site is served from to the project's
 * allowlist in that dashboard, otherwise the connect modal refuses to load.
 *
 * The project id is public by design: it ships to the browser. It is not a secret.
 *
 * Without a project id the app falls back to the browser extension wallet only.
 */

export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '').trim();

export const APP_METADATA = {
  name: 'Knix',
  description: 'Clock gated self custody for tokenized stocks on Robinhood Chain.',
  icons: ['/favicon.svg'],
};
