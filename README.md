# Knix Web

Static frontend for Knix on Robinhood Chain. Vite, vanilla JS, Three.js (lazy loaded), Reown AppKit
for wallets (lazy loaded). No backend, no SSR.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview  # serve dist/ locally
```

Node 22 (see `engines` in `package.json`).

## Pages

| Path | Entry | Purpose |
| --- | --- | --- |
| `/` | `index.html` + `src/main.js` | Landing, with the live Pool card |
| `/app` | `app.html` + `src/app.js` | Pool app and module surfaces |
| any other | `public/404.html` | Not found page (served by Vercel) |

## Configuration

| File | What lives there |
| --- | --- |
| `src/config/contracts.js` | **Every contract address.** One address book per network. Mainnet is filled. |
| `src/config/network.js` | Chain id, RPC and explorer for Robinhood Chain mainnet and testnet. |
| `src/config/wallet.js` | WalletConnect (Reown) project id and app metadata. |
| `.env.example` | Build time values (`VITE_*`). Env values win over the files. |

All `VITE_*` values end up in the browser bundle. Only put public values there, never a key.

### Contracts

Robinhood Chain mainnet (4663):

| Contract | Address |
| --- | --- |
| Knix | `0x3DD411C10ffa55Bb13B54e289de6aA7e3c3A03a0` |
| KnixLens | `0x0E0f6eE839e58462Ece17C06E9A6dA4Bc2aa7eD4` |
| $KNIX token | not deployed, the CA section shows Coming Soon |

Set `KNIX_TOKEN_ADDRESS` (or `VITE_KNIX_TOKEN_ADDRESS`) once the token exists; the CA component then
shows the address with copy and an explorer link.

`src/lib/knix.js` is the contract client. Reads go to the public RPC, writes go through the wallet
store, receipts are polled on the public RPC. Calldata is encoded by hand from the selectors listed
at the top of the file.

### Wallets

`src/lib/wallet.js` uses Reown AppKit when `VITE_WALLETCONNECT_PROJECT_ID` is set: browser extensions,
WalletConnect QR and mobile wallets, with a network switch to Robinhood Chain. AppKit loads on the
app page after first paint, and on the landing only when the Pool card nears the viewport.

Without a project id the store falls back to the injected browser wallet (`window.ethereum`).

1. Create a project at [dashboard.reown.com](https://dashboard.reown.com) and copy its project id.
2. Put it in `.env` locally and in the Vercel project settings for production.
3. In the Reown dashboard, add every domain the site runs on (production domain, `*.vercel.app`
   previews if you use them) to the allowlist. Unlisted domains get a 403 and an empty wallet list.

## Deploy on Vercel

1. Import the repository in Vercel. `vercel.json` sets the framework, `npm ci`, the build command and
   `dist` as output.
2. Environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `VITE_WALLETCONNECT_PROJECT_ID` | your Reown project id |
   | `VITE_KNIX_NETWORK` | `mainnet` (default, optional) |
   | `VITE_RPC_URL_MAINNET` | optional managed RPC; the public one is rate limited |

3. Deploy, then add the production domain to the Reown allowlist.

`vercel.json` also serves `/app` without the `.html` suffix, caches hashed assets for a year, and
sends `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and a restrictive `Permissions-Policy`.

## Structure

```
src/
  config/       network.js, contracts.js, wallet.js
  lib/          wallet (AppKit or injected), appkit, knix (contract client), rpc, motion, address
  components/   pool, contract-address, nav
  three/        liquid hero, section views, CTA silk
  styles/       base, pool, modules, landing, app
```

Motion respects `prefers-reduced-motion`. Ambient loops pause off screen; WebGL stops rendering when
not visible.
